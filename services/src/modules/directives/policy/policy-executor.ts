import { GraphQLResolveInfo } from 'graphql';
import { Logger } from 'pino';
import logger, { createChildLogger } from '../../logger';
import { RequestContext } from '../../context';
import { PolicyDefinition, PolicyArgsObject } from '../../resource-repository';
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
import preparePolicyArgs from './policy-arguments-evaluation';

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
    const policyDefinition = getPolicyDefinition(requestContext.resourceGroup.policies, policy.namespace, policy.name);
    if (!policyDefinition) {
      policyLogger.error('The policy was not found');
      throw new PolicyExecutionFailedError(
        { namespace: policy.namespace, name: policy.name },
        `The policy was not found`,
        info.parentType.name,
        info.fieldName
      );
    }

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
    const policyDefinition = getPolicyDefinition(requestContext.resourceGroup.policies, policy.namespace, policy.name);
    if (!policyDefinition) {
      policyLogger.error('The policy was not found');
      throw new PolicyExecutionFailedError(
        { namespace: policy.namespace, name: policy.name },
        `The policy was not found`,
        info.parentType.name,
        info.fieldName
      );
    }
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
    if (requestContext.ignorePolicies) return;

    const logData = {
      policy: {
        namespace: policy.namespace,
        name: policy.name,
      },
      type: info.parentType.name,
      field: info.fieldName,
    };
    const policyLogger = createChildLogger(logger, 'policy-executor', logData);
    policyLogger.trace('Validating policy...');
    const allow = await this.evaluatePolicy(policy, policyLogger, source, gqlArgs, requestContext, info, result);
    policyLogger.trace(`Policy validated. The resolver execution is ${allow ? 'allowed' : 'denied'}`);
    if (!allow) {
      throw new UnauthorizedByPolicyError(policy, info.parentType.name, info.fieldName);
    }
  }

  validatePolicySync(
    policy: Policy,
    source: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): void {
    if (requestContext.ignorePolicies) return;

    const logData = {
      policy: {
        namespace: policy.namespace,
        name: policy.name,
      },
      type: info.parentType.name,
      field: info.fieldName,
    };
    const policyLogger = createChildLogger(logger, 'policy-executor', logData);
    policyLogger.trace('Validating policy...');
    const allow = this.evaluatePolicySync(policy, policyLogger, source, gqlArgs, requestContext, info);
    policyLogger.trace(`Policy validated. The resolver execution is ${allow ? 'allowed' : 'denied'}`);
    if (!allow) {
      throw new UnauthorizedByPolicyError(policy, info.parentType.name, info.fieldName);
    }
  }

  private async getPolicyResult(ctx: PolicyDirectiveExecutionContext): Promise<boolean> {
    const args = preparePolicyArgs(ctx);
    const cacheKey = { args, metadata: ctx.policyDefinition.metadata };
    const executionFunction = async () => {
      const query = await getQueryResult(ctx, args);
      return this._evaluatePolicy(ctx, args, query);
    };

    return this.asyncCache.getOperationResult(cacheKey, executionFunction, ctx.logger);
  }

  private getPolicyResultSync(ctx: PolicyDirectiveExecutionContext): boolean {
    const args = preparePolicyArgs(ctx);
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
        `Unsupported policy type ${ctx.policyDefinition.type}`,
        ctx.info.parentType.name,
        ctx.info.fieldName
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
      throw new PolicyExecutionFailedError(
        ctx.policyDefinition.metadata,
        'in-line query evaluation not yet supported',
        ctx.info.parentType.name,
        ctx.info.fieldName
      );
    }

    ctx.logger.trace(logData, 'OPA policy executed');
    return allow || false;
  }
}

export function getPolicyDefinition(policyDefinitions: PolicyDefinition[], namespace: string, name: string) {
  return policyDefinitions.find(({ metadata }) => {
    return metadata.namespace === namespace && metadata.name === name;
  });
}
