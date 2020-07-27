import { GraphQLResolveInfo } from 'graphql';
import { RequestContext } from '../../context';
import { Policy as PolicyDefinition, PolicyArgsObject } from '../../resource-repository';
import { inject } from '../../arguments-injection';
import { Policy, PolicyDirectiveExecutionContext, GraphQLArguments, PolicyCacheKey } from './types';
import { evaluate as evaluateOpa } from './opa';
import { getQueryResult } from './policy-query-helper';
import CachedOperation from './cached-operation';

const typeEvaluators = {
  opa: evaluateOpa,
};

export default class PolicyExecutor extends CachedOperation<PolicyCacheKey, boolean> {
  async evaluatePolicy(
    policy: Policy,
    parent: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): Promise<boolean> {
    const policyDefinition = this.getPolicyDefinition(requestContext.policies, policy.namespace, policy.name);
    return this.getPolicyResult({ policy, parent, gqlArgs, requestContext, info, policyDefinition });
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

  private async getPolicyResult(ctx: PolicyDirectiveExecutionContext): Promise<boolean> {
    const args = this.preparePolicyArgs(ctx);
    const cacheKey = { args, metadata: ctx.policyDefinition.metadata };
    const executionFunction = () => this._evaluatePolicy(ctx, args);

    return this.getOperationResult(cacheKey, executionFunction);
  }

  private async _evaluatePolicy(ctx: PolicyDirectiveExecutionContext, args: PolicyArgsObject = {}): Promise<boolean> {
    const query = await getQueryResult(ctx, args);

    const evaluate = typeEvaluators[ctx.policyDefinition.type];
    if (!evaluate) throw new Error(`Unsupported policy type ${ctx.policyDefinition.type}`);

    const { done, allow } = evaluate({
      ...ctx.policy,
      args,
      query,
      policyAttachments: ctx.requestContext.policyAttachments,
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
        policyArgValue = inject(policyArgValue, ctx.parent, ctx.gqlArgs, ctx.requestContext, ctx.info);
      }

      policyArgs[policyArgName] = policyArgValue;
      return policyArgs;
    }, {});
  }

  private getPolicyDefinition(policyDefinitions: PolicyDefinition[], namespace: string, name: string) {
    const policyDefinition = policyDefinitions.find(({ metadata }) => {
      return metadata.namespace === namespace && metadata.name === name;
    });

    if (!policyDefinition) throw new Error(`The policy ${name} in namespace ${namespace} was not found`);
    return policyDefinition;
  }
}

declare module '../../context' {
  interface RequestContext {
    policyExecutor: PolicyExecutor;
  }
}
