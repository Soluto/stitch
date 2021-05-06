import { GraphQLResolveInfo, parseType } from 'graphql';
import { Logger } from 'pino';
import logger from '../../logger';
import { RequestContext } from '../../context';
import { PolicyDefinition, PolicyArgsObject } from '../../resource-repository';
import { inject } from '../../arguments-injection';
import {
  Policy,
  PolicyDirectiveExecutionContext,
  GraphQLArguments,
  PolicyCacheKey,
  QueryResults,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
} from './types';
import { evaluate as evaluateOpa } from './opa';
import { getQueryResult } from './policy-query-helper';
import CachedOperation from './cached-operation';
import UnauthorizedByPolicyError from './unauthorized-by-policy-error';
import PolicyExecutionFailedError from './policy-execution-failed-error';

const typeEvaluators: Record<string, (ctx: PolicyEvaluationContext) => PolicyEvaluationResult> = {
  opa: evaluateOpa,
};

export default class PolicyExecutor {
  private readonly asyncCache = new CachedOperation<PolicyCacheKey, Promise<boolean>>();
  private readonly syncCache = new CachedOperation<PolicyCacheKey, boolean>();

  async evaluatePolicy(
    policy: Policy,
    policyLogger: Logger,
    source: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo,
    result?: unknown
  ): Promise<boolean> {
    const policyDefinition = getPolicyDefinition(
      requestContext.resourceGroup.policies,
      policy.namespace,
      policy.name,
      policyLogger
    );
    return this.getPolicyResult({
      policy,
      policyDefinition,
      source,
      gqlArgs,
      requestContext,
      info,
      result,
      logger: policyLogger,
    });
  }

  evaluatePolicySync(
    policy: Policy,
    policyLogger: Logger,
    source: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo,
    result?: unknown
  ): boolean {
    const policyDefinition = getPolicyDefinition(
      requestContext.resourceGroup.policies,
      policy.namespace,
      policy.name,
      policyLogger
    );
    return this.getPolicyResultSync({
      policy,
      policyDefinition,
      source,
      gqlArgs,
      requestContext,
      info,
      result,
      logger: policyLogger,
    });
  }

  async validatePolicy(
    policy: Policy,
    source: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo,
    result?: unknown
  ): Promise<void> {
    const logData = {
      name: 'policy-executor',
      policy: {
        namespace: policy.namespace,
        name: policy.name,
      },
      type: info.parentType.name,
      field: info.fieldName,
    };
    const policyLogger = logger.child(logData);
    policyLogger.trace('Validating policy...');
    const allow = await this.evaluatePolicy(policy, policyLogger, source, gqlArgs, requestContext, info, result);
    policyLogger.trace(`Policy validated. The resolver execution is ${allow ? 'allowed' : 'denied'}`);
    if (!allow) {
      throw new UnauthorizedByPolicyError(policy);
    }
  }

  validatePolicySync(
    policy: Policy,
    source: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): void {
    const logData = {
      name: 'policy-executor',
      policy: {
        namespace: policy.namespace,
        name: policy.name,
      },
      type: info.parentType.name,
      field: info.fieldName,
    };
    const policyLogger = logger.child(logData);
    policyLogger.trace('Validating policy...');
    const allow = this.evaluatePolicySync(policy, policyLogger, source, gqlArgs, requestContext, info);
    policyLogger.trace(`Policy validated. The resolver execution is ${allow ? 'allowed' : 'denied'}`);
    if (!allow) {
      throw new UnauthorizedByPolicyError(policy);
    }
  }

  private async getPolicyResult(ctx: PolicyDirectiveExecutionContext): Promise<boolean> {
    const args = this.preparePolicyArgs(ctx);
    const cacheKey = { args, metadata: ctx.policyDefinition.metadata };
    const executionFunction = async () => {
      const query = await getQueryResult(ctx, args);
      return this._evaluatePolicy(ctx, args, query);
    };

    return this.asyncCache.getOperationResult(cacheKey, executionFunction, ctx.logger);
  }

  private getPolicyResultSync(ctx: PolicyDirectiveExecutionContext): boolean {
    const args = this.preparePolicyArgs(ctx);
    const cacheKey = { args, metadata: ctx.policyDefinition.metadata };
    const executionFunction = () => this._evaluatePolicy(ctx, args);

    return this.syncCache.getOperationResult(cacheKey, executionFunction, ctx.logger);
  }

  private _evaluatePolicy(
    ctx: PolicyDirectiveExecutionContext,
    args: PolicyArgsObject = {},
    query?: QueryResults
  ): boolean {
    const evaluate = typeEvaluators[ctx.policyDefinition.type];
    if (!evaluate)
      throw new PolicyExecutionFailedError(
        ctx.policyDefinition.metadata,
        `Unsupported policy type ${ctx.policyDefinition.type}`
      );

    const logData = {
      args,
      query,
    };
    ctx.logger.trace(logData, 'Executing OPA policy...');

    const { done, allow } = evaluate({
      ...ctx.policy,
      args,
      query,
      policyAttachments: ctx.requestContext.resourceGroup.policyAttachments!,
    });
    if (!done) {
      ctx.logger.error('in-line query evaluation not yet supported');
      throw new PolicyExecutionFailedError(ctx.policyDefinition.metadata, 'in-line query evaluation not yet supported');
    }

    ctx.logger.trace(logData, 'OPA policy executed');
    return allow || false;
  }

  private preparePolicyArgs(ctx: PolicyDirectiveExecutionContext): PolicyArgsObject | undefined {
    ctx.logger.trace('Preparing policy arguments...');
    const supportedPolicyArgs = ctx.policyDefinition.args;
    if (!supportedPolicyArgs) return;

    const policyArgs = Object.entries(supportedPolicyArgs).reduce<PolicyArgsObject>(
      (policyArgs, [policyArgName, { default: defaultArg, type, optional = false }]) => {
        ctx.logger.trace(`Evaluating policy argument "${policyArgName}"...`);
        const isPolicyArgProvided =
          ctx.policy.args && Object.prototype.hasOwnProperty.call(ctx.policy.args, policyArgName);

        let policyArgValue = isPolicyArgProvided ? ctx.policy.args?.[policyArgName] : defaultArg;

        if (policyArgValue === undefined) {
          if (!optional) {
            ctx.logger.error({ policyArgName }, `Missing argument "${policyArgName}"`);
            throw new PolicyExecutionFailedError(ctx.policyDefinition.metadata, `Missing argument "${policyArgName}"`);
          }

          policyArgValue = null;
        }

        if (typeof policyArgValue === 'string') {
          const { source, gqlArgs: args, requestContext: context, info, result } = ctx;
          policyArgValue = inject(policyArgValue, { source, args, context, info, result });
        }

        policyArgs[policyArgName] = policyArgValue;
        ctx.logger.trace(
          { [policyArgName]: policyArgValue },
          `Policy argument "${policyArgName}" evaluated to "${policyArgValue}"`
        );

        const typeAST = parseType(type);
        if (typeAST.kind === 'NonNullType' && (typeof policyArgValue === 'undefined' || policyArgValue === null)) {
          const errorMessage = `Non-nullable argument "${policyArgName}" got value "${policyArgValue}"`;
          ctx.logger.error({ policyArgName }, errorMessage);
          throw new PolicyExecutionFailedError(ctx.policyDefinition.metadata, errorMessage);
        }

        return policyArgs;
      },
      {}
    );
    ctx.logger.trace({ policyArgs }, 'Policy arguments calculated');
    return policyArgs;
  }
}

export function getPolicyDefinition(
  policyDefinitions: PolicyDefinition[],
  namespace: string,
  name: string,
  policyLogger: Logger = logger
) {
  const policyDefinition = policyDefinitions.find(({ metadata }) => {
    return metadata.namespace === namespace && metadata.name === name;
  });

  if (!policyDefinition) {
    policyLogger.error('The policy was not found');
    throw new PolicyExecutionFailedError({ namespace, name }, `The policy was not found`);
  }
  return policyDefinition;
}
