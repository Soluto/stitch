import { GraphQLResolveInfo, graphql } from 'graphql';
import { RequestContext } from '../../context';
import { Policy as PolicyDefinition, PolicyArgsObject, PolicyAttachments } from '../../resource-repository';
import { inject } from '../../arguments-injection';
import { Policy, GraphQLArguments, QueryResults } from './types';
import { evaluate as evaluateOpa } from './opa';

const typeEvaluators = {
  opa: evaluateOpa,
};

export class PolicyExecutor {
  private policyDefinition: PolicyDefinition;
  private policyAttachments: PolicyAttachments;

  private constructor(
    protected policy: Policy,
    protected parent: unknown,
    protected args: GraphQLArguments,
    protected context: RequestContext,
    protected info: GraphQLResolveInfo
  ) {
    this.policyDefinition = this.getPolicyDefinition(context.policies, this.policy.namespace, this.policy.name);
    this.policyAttachments = context.policyAttachments;
  }

  static async evaluatePolicy(
    policy: Policy,
    parent: unknown,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
  ): Promise<boolean> {
    const executor = new PolicyExecutor(policy, parent, args, context, info);
    return executor.evaluatePolicy();
  }

  static async validatePolicy(
    policy: Policy,
    parent: unknown,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
  ): Promise<void> {
    const executor = new PolicyExecutor(policy, parent, args, context, info);
    const allow = await executor.evaluatePolicy();
    if (!allow)
      throw new Error(`Unauthorized by policy ${executor.policy.name} in namespace ${executor.policy.namespace}`);
  }

  private async evaluatePolicy(): Promise<boolean> {
    const args = this.preparePolicyArgs();
    const query = await this.evaluatePolicyQuery(args);

    const evaluate = typeEvaluators[this.policyDefinition.type];
    if (!evaluate) throw new Error(`Unsupported policy type ${this.policyDefinition.type}`);

    const { done, allow } = await evaluate({
      ...this.policy,
      args,
      query,
      policyAttachments: this.policyAttachments,
    });
    if (!done) throw new Error('in-line query evaluation not yet supported');
    return allow || false;
  }

  private preparePolicyArgs(): PolicyArgsObject | undefined {
    const supportedPolicyArgs = this.policyDefinition.args;
    if (!supportedPolicyArgs) return;

    return Object.keys(supportedPolicyArgs).reduce<PolicyArgsObject>((policyArgs, policyArgName) => {
      if (this.policy?.args?.[policyArgName] === undefined)
        throw new Error(
          `Missing arg ${policyArgName} for policy ${this.policy.name} in namespace ${this.policy.namespace}`
        );

      let policyArgValue = this.policy.args[policyArgName];
      if (typeof policyArgValue === 'string') {
        policyArgValue = inject(policyArgValue, this.parent, this.args, this.context, this.info);
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

  private async evaluatePolicyQuery(args: PolicyArgsObject = {}): Promise<QueryResults | undefined> {
    const query = this.policyDefinition.query;
    if (!query) return;

    const variableValues =
      query.variables &&
      Object.entries(query.variables).reduce<{ [key: string]: unknown }>((policyArgs, [varName, varValue]) => {
        if (typeof varValue === 'string') {
          // TODO: Currently only "{args.xxx} can be used for variables so other parameters are useless
          varValue = inject(varValue as string, this.parent, args, this.context, this.info);
        }
        policyArgs[varName] = varValue;
        return policyArgs;
      }, {});

    const context: RequestContext = { ...this.context, ignorePolicies: true };
    const gqlResult = await graphql(this.info.schema, query.gql, undefined, context, variableValues);
    return gqlResult.data || undefined;
  }
}

declare module '../../context' {
  interface RequestContext {
    /**
     * This flag indicates that request should be resolved without invoking authorization policies evaluation
     */
    ignorePolicies: boolean;
  }
}
