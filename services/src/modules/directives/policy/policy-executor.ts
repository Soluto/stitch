import {GraphQLResolveInfo} from 'graphql';
import {RequestContext} from '../../context';
import {Policy, GraphQLArguments} from './types';
import {Policy as PolicyDefinition, PolicyArgsObject, PolicyAttachments} from '../../resource-repository';
import {evaluate as evaluateOpa} from './opa';
import {injectParameters} from '../../paramInjection';

const typeEvaluators = {
    opa: evaluateOpa,
};

export class PolicyExecutor {
    private policyDefinitions: PolicyDefinition[];
    private policyAttachments: PolicyAttachments;

    constructor(
        protected policies: Policy[],
        protected parent: any,
        protected args: GraphQLArguments,
        protected context: RequestContext,
        protected info: GraphQLResolveInfo
    ) {
        // TODO: add jwt data
        this.policyDefinitions = context.policies;
        this.policyAttachments = context.policyAttachments;
    }

    async validatePolicies() {
        await Promise.all(this.policies.map(r => this.validatePolicy(r)));
    }

    async validatePolicy(policy: Policy) {
        const policyDefinition = this.getPolicyDefinition(policy.namespace, policy.name);

        const args = policyDefinition.args && this.preparePolicyArgs(policyDefinition.args, policy);
        // TODO: evaluate queries

        const evaluate = typeEvaluators[policyDefinition.type];
        if (!evaluate) throw new Error(`Unsupported policy type ${policyDefinition.type}`);

        const {done, allow} = await evaluate({...policy, args, policyAttachments: this.policyAttachments});
        if (!done) throw new Error('in-line query evaluation not yet supported');

        if (!allow) throw new Error(`Unauthorized by policy ${policy.name} in namespace ${policy.namespace}`);
    }

    private preparePolicyArgs(supportedPolicyArgs: PolicyArgsObject, policy: Policy): PolicyArgsObject {
        return Object.keys(supportedPolicyArgs).reduce<PolicyArgsObject>((policyArgs, policyArgName) => {
            if (policy?.args?.[policyArgName] === undefined)
                throw new Error(
                    `Missing arg ${policyArgName} for policy ${policy.name} in namespace ${policy.namespace}`
                );

            let policyArgValue = policy.args[policyArgName];
            if (typeof policyArgValue === 'string') {
                policyArgValue = injectParameters(policyArgValue, this.parent, this.args, this.context, this.info)
                    .value;
            }

            policyArgs[policyArgName] = policyArgValue;
            return policyArgs;
        }, {});
    }

    private getPolicyDefinition(namespace: string, name: string) {
        const policyDefinition = this.policyDefinitions.find(({metadata}) => {
            return metadata.namespace === namespace && metadata.name === name;
        });

        if (!policyDefinition) throw new Error(`The policy ${name} in namespace ${namespace} was not found`);
        return policyDefinition;
    }
}
