import { GraphQLResolveInfo, graphql } from 'graphql';
import { RequestContext } from '../../context';
import { Policy as PolicyDefinition, PolicyArgsObject } from '../../resource-repository';
import { inject, injectArgs } from '../../arguments-injection';
import { Policy, PolicyDirectiveExecutionContext, GraphQLArguments, QueryResults } from './types';
import { evaluate as evaluateOpa } from './opa';

const typeEvaluators = {
  opa: evaluateOpa,
};

export class PolicyExecutor {
  async evaluatePolicy(
    policy: Policy,
    parent: unknown,
    gqlArgs: GraphQLArguments,
    requestContext: RequestContext,
    info: GraphQLResolveInfo
  ): Promise<boolean> {
    const policyDefinition = this.getPolicyDefinition(requestContext.policies, policy.namespace, policy.name);
    return this._evaluatePolicy({ policy, parent, gqlArgs, requestContext, info, policyDefinition });
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

  private async _evaluatePolicy(ctx: PolicyDirectiveExecutionContext): Promise<boolean> {
    const args = this.preparePolicyArgs(ctx);
    const query = await this.evaluatePolicyQuery(ctx, args);

    const evaluate = typeEvaluators[ctx.policyDefinition.type];
    if (!evaluate) throw new Error(`Unsupported policy type ${ctx.policyDefinition.type}`);

    const { done, allow } = await evaluate({
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

  private async evaluatePolicyQuery(
    ctx: PolicyDirectiveExecutionContext,
    args: PolicyArgsObject = {}
  ): Promise<QueryResults | undefined> {
    const query = ctx.policyDefinition.query;
    if (!query) return;

    const variableValues =
      query.variables &&
      Object.entries(query.variables).reduce<{ [key: string]: unknown }>((policyArgs, [varName, varValue]) => {
        if (typeof varValue === 'string') {
          varValue = injectArgs(varValue, args);
        }
        policyArgs[varName] = varValue;
        return policyArgs;
      }, {});

    const requestContext: RequestContext = { ...ctx.requestContext, ignorePolicies: true };
    const gqlResult = await graphql(ctx.info.schema, query.gql, undefined, requestContext, variableValues);
    return gqlResult.data || undefined;
  }
}

declare module '../../context' {
  interface RequestContext {
    policyExecutor: PolicyExecutor;
    /**
     * This flag indicates that request should be resolved without invoking authorization policies evaluation
     */
    ignorePolicies: boolean;
  }
}
