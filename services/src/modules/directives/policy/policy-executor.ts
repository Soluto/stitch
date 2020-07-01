import {GraphQLResolveInfo, graphql} from 'graphql';
import {RequestContext} from '../../context';
import {Policy, GraphQLArguments, QueryResults} from './types';
import {Policy as PolicyDefinition, PolicyArgsObject, PolicyAttachments} from '../../resource-repository';
import {evaluate as evaluateOpa} from './opa';
import {injectParameters, resolveParameters} from '../../paramInjection';

const typeEvaluators = {
    opa: evaluateOpa,
};

export class PolicyExecutor {
    private policyDefinition: PolicyDefinition;
    private policyAttachments: PolicyAttachments;

    private constructor(
        protected policy: Policy,
        protected parent: any,
        protected args: GraphQLArguments,
        protected context: RequestContext,
        protected info: GraphQLResolveInfo
    ) {
        this.policyDefinition = this.getPolicyDefinition(context.policies, this.policy.namespace, this.policy.name);
        this.policyAttachments = context.policyAttachments;
    }

    static async evaluatePolicy(
        policy: Policy,
        parent: any,
        args: GraphQLArguments,
        context: RequestContext,
        info: GraphQLResolveInfo
    ): Promise<boolean> {
        const executor = new PolicyExecutor(policy, parent, args, context, info);
        return executor.evaluatePolicy();
    }

    static async validatePolicy(
        policy: Policy,
        parent: any,
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

        const {done, allow} = await evaluate({
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

        return Object.entries(supportedPolicyArgs).reduce<PolicyArgsObject>(
            (policyArgs, [policyArgName, policyArgType]) => {
                if (this.policy?.args?.[policyArgName] === undefined)
                    throw new Error(
                        `Missing arg ${policyArgName} for policy ${this.policy.name} in namespace ${this.policy.namespace}`
                    );

                let policyArgValue = this.policy.args[policyArgName];
                if (typeof policyArgValue === 'string') {
                    if (policyArgType === 'String') {
                        policyArgValue = injectParameters(
                            policyArgValue,
                            this.parent,
                            this.args,
                            this.context,
                            this.info
                        ).value;
                    } else {
                        const resolvedArgValue = resolveParameters(
                            policyArgValue,
                            this.parent,
                            this.args,
                            this.context,
                            this.info
                        );
                        if (resolvedArgValue) {
                            policyArgValue = resolvedArgValue[policyArgValue];
                        }
                    }
                }

                policyArgs[policyArgName] = policyArgValue;
                return policyArgs;
            },
            {}
        );
    }

    private getPolicyDefinition(policyDefinitions: PolicyDefinition[], namespace: string, name: string) {
        const policyDefinition = policyDefinitions.find(({metadata}) => {
            return metadata.namespace === namespace && metadata.name === name;
        });

        if (!policyDefinition) throw new Error(`The policy ${name} in namespace ${namespace} was not found`);
        return policyDefinition;
    }

    private async evaluatePolicyQuery(args: PolicyArgsObject = {}): Promise<QueryResults | undefined> {
        const query = this.policyDefinition.query;
        if (!query) return;

        let variableValues =
            query.variables &&
            Object.entries(query.variables).reduce<{[key: string]: any}>((policyArgs, [varName, varValue]) => {
                if (typeof varValue === 'string') {
                    const resolvedValue = resolveParameters(varValue, this.parent, args, this.context, this.info);
                    if (resolvedValue) {
                        varValue = resolvedValue[varValue];
                    }
                }
                policyArgs[varName] = varValue;
                return policyArgs;
            }, {});

        const context: RequestContext = {...this.context, ignorePolicies: true};
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
