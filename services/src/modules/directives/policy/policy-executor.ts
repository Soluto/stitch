import { GraphQLResolveInfo } from 'graphql';
import { RequestContext } from '../../context';
import { PolicyDefinition, PolicyArgsObject } from '../../resource-repository';
import { inject } from '../../arguments-injection';
import { Policy, PolicyDirectiveExecutionContext, GraphQLArguments, PolicyCacheKey, QueryResults } from './types';
import { evaluate as evaluateOpa } from './opa';
import { getQueryResult } from './policy-query-helper';
import CachedOperation from './cached-operation';

const typeEvaluators = {
  opa: evaluateOpa,
};

export default class PolicyExecutor {
  private asyncCache: CachedOperation<PolicyCacheKey, Promise<boolean>>;
  private syncCache: CachedOperation<PolicyCacheKey, boolean>;

  constructor() {
    this.asyncCache = new CachedOperation<PolicyCacheKey, Promise<boolean>>();
    this.syncCache = new CachedOperation<PolicyCacheKey, boolean>();
  }

  async evaluatePolicy(
    policy: Policy,
    parent: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): Promise<boolean> {
    const policyDefinition = this.getPolicyDefinition(
      requestContext.authorizationConfig.policies,
      policy.namespace,
      policy.name
    );
    return this.getPolicyResult({ policy, parent, gqlArgs, requestContext, info, policyDefinition });
  }

  evaluatePolicySync(
    policy: Policy,
    parent: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): boolean {
    const policyDefinition = this.getPolicyDefinition(
      requestContext.authorizationConfig.policies,
      policy.namespace,
      policy.name
    );
    const result = this.getPolicyResultSync({ policy, parent, gqlArgs, requestContext, info, policyDefinition });
    return result;
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
    const args = PolicyExecutor.preparePolicyArgs(ctx);
    const cacheKey = { args, metadata: ctx.policyDefinition.metadata };
    const executionFunction = () => this._evaluatePolicy(ctx, args);

    return this.asyncCache.getOperationResult(cacheKey, executionFunction);
  }

  private getPolicyResultSync(ctx: PolicyDirectiveExecutionContext): boolean {
    const args = PolicyExecutor.preparePolicyArgs(ctx);
    const cacheKey = { args, metadata: ctx.policyDefinition.metadata };
    const executionFunction = () => this._evaluatePolicySync(ctx, args);

    return this.syncCache.getOperationResult(cacheKey, executionFunction);
  }

  private async _evaluatePolicy(ctx: PolicyDirectiveExecutionContext, args: PolicyArgsObject = {}): Promise<boolean> {
    const query = await getQueryResult(ctx, args);
    return this._evaluatePolicySync(ctx, args, query);
  }

  private _evaluatePolicySync(
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
      policyAttachments: ctx.requestContext.authorizationConfig.policyAttachments!,
    });
    if (!done) throw new Error('in-line query evaluation not yet supported');
    return allow || false;
  }

  static preparePolicyArgs(ctx: PolicyDirectiveExecutionContext): PolicyArgsObject | undefined {
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
        policyArgValue = inject(policyArgValue, ctx.parent, ctx.gqlArgs, ctx.requestContext, ctx.info);
      }

      policyArgs[policyArgName] = policyArgValue;
      return policyArgs;
    }, {});
  }

  getPolicyDefinition(policyDefinitions: PolicyDefinition[], namespace: string, name: string) {
    const policyDefinition = policyDefinitions.find(({ metadata }) => {
      return metadata.namespace === namespace && metadata.name === name;
    });

    if (!policyDefinition) throw new Error(`The policy ${name} in namespace ${namespace} was not found`);
    return policyDefinition;
  }
}
