import { GraphQLResolveInfo } from 'graphql';
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
    source: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): Promise<boolean> {
    const policyDefinition = getPolicyDefinition(requestContext.resourceGroup.policies, policy.namespace, policy.name);
    return this.getPolicyResult({ policy, source, gqlArgs, requestContext, info, policyDefinition });
  }

  evaluatePolicySync(
    policy: Policy,
    source: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): boolean {
    const policyDefinition = getPolicyDefinition(requestContext.resourceGroup.policies, policy.namespace, policy.name);
    return this.getPolicyResultSync({ policy, source, gqlArgs, requestContext, info, policyDefinition });
  }

  async validatePolicy(
    policy: Policy,
    parent: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): Promise<void> {
    const allow = await this.evaluatePolicy(policy, parent, gqlArgs, requestContext, info);
    if (!allow) {
      throw new UnauthorizedByPolicyError(policy);
    }
  }

  validatePolicySync(
    policy: Policy,
    parent: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): void {
    const allow = this.evaluatePolicySync(policy, parent, gqlArgs, requestContext, info);
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

    return this.asyncCache.getOperationResult(cacheKey, executionFunction);
  }

  private getPolicyResultSync(ctx: PolicyDirectiveExecutionContext): boolean {
    const args = this.preparePolicyArgs(ctx);
    const cacheKey = { args, metadata: ctx.policyDefinition.metadata };
    const executionFunction = () => this._evaluatePolicy(ctx, args);

    return this.syncCache.getOperationResult(cacheKey, executionFunction);
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
      type: ctx.info.parentType.name,
      field: ctx.info.fieldName,
      metadata: ctx.policyDefinition.metadata,
      args,
      query,
    };
    logger.trace(logData, 'Executing policy...');

    const { done, allow } = evaluate({
      ...ctx.policy,
      args,
      query,
      policyAttachments: ctx.requestContext.resourceGroup.policyAttachments!,
    });
    if (!done)
      throw new PolicyExecutionFailedError(ctx.policyDefinition.metadata, 'in-line query evaluation not yet supported');

    logger.trace(logData, `Policy executed. The resolver execution is ${allow ? 'allowed' : 'denied'}`);
    return allow || false;
  }

  private preparePolicyArgs(ctx: PolicyDirectiveExecutionContext): PolicyArgsObject | undefined {
    const supportedPolicyArgs = ctx.policyDefinition.args;
    if (!supportedPolicyArgs) return;

    return Object.entries(supportedPolicyArgs).reduce<PolicyArgsObject>(
      (policyArgs, [policyArgName, { default: defaultArg, optional = false }]) => {
        const isPolicyArgProvided =
          ctx.policy.args && Object.prototype.hasOwnProperty.call(ctx.policy.args, policyArgName);

        let policyArgValue = isPolicyArgProvided ? ctx.policy.args?.[policyArgName] : defaultArg;

        if (policyArgValue === undefined) {
          if (!optional) {
            throw new PolicyExecutionFailedError(ctx.policyDefinition.metadata, `Missing arg ${policyArgName}`);
          }

          policyArgValue = null;
        }

        if (typeof policyArgValue === 'string') {
          const { source, gqlArgs: args, requestContext: context, info } = ctx;
          policyArgValue = inject(policyArgValue, { source, args, context, info });
        }

        policyArgs[policyArgName] = policyArgValue;
        return policyArgs;
      },
      {}
    );
  }
}

export function getPolicyDefinition(policyDefinitions: PolicyDefinition[], namespace: string, name: string) {
  const policyDefinition = policyDefinitions.find(({ metadata }) => {
    return metadata.namespace === namespace && metadata.name === name;
  });

  if (!policyDefinition) throw new PolicyExecutionFailedError({ namespace, name }, `The policy was not found`);
  return policyDefinition;
}
