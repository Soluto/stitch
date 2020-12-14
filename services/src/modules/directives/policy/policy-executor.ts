import { GraphQLResolveInfo } from 'graphql';
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
      throw new Error(`Unauthorized by policy ${policy.name} in namespace ${policy.namespace}`);
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
      throw new Error(`Unauthorized by policy ${policy.name} in namespace ${policy.namespace}`);
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
    if (!evaluate) throw new Error(`Unsupported policy type ${ctx.policyDefinition.type}`);

    const { done, allow } = evaluate({
      ...ctx.policy,
      args,
      query,
      policyAttachments: ctx.requestContext.resourceGroup.policyAttachments!,
    });
    if (!done) throw new Error('in-line query evaluation not yet supported');
    return allow || false;
  }

  private preparePolicyArgs(ctx: PolicyDirectiveExecutionContext): PolicyArgsObject | undefined {
    const supportedPolicyArgs = ctx.policyDefinition.args;
    if (!supportedPolicyArgs) return;

    return Object.keys(supportedPolicyArgs).reduce<PolicyArgsObject>((policyArgs, policyArgName) => {
      if (ctx.policy?.args?.[policyArgName] === undefined) {
        throw new Error(
          `Missing arg ${policyArgName} for policy ${ctx.policy.name} in namespace ${ctx.policy.namespace}`
        );
      }

      let policyArgValue = ctx.policy.args[policyArgName];
      if (typeof policyArgValue === 'string') {
        const { source, gqlArgs: args, requestContext: context, info } = ctx;
        policyArgValue = inject(policyArgValue, { source, args, context, info });
      }

      policyArgs[policyArgName] = policyArgValue;
      return policyArgs;
    }, {});
  }
}

export function getPolicyDefinition(policyDefinitions: PolicyDefinition[], namespace: string, name: string) {
  const policyDefinition = policyDefinitions.find(({ metadata }) => {
    return metadata.namespace === namespace && metadata.name === name;
  });

  if (!policyDefinition) throw new Error(`The policy ${name} in namespace ${namespace} was not found`);
  return policyDefinition;
}
