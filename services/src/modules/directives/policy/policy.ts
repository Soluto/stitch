import {GraphQLResolveInfo} from 'graphql';
import {RequestContext} from '../../context';
import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField, defaultFieldResolver} from 'graphql';
import {gql} from 'apollo-server-core';
import {PolicyExecutor} from './policy-executor';

export class PolicyDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const originalResolve = field.resolve || defaultFieldResolver;
        const policies = this.args.policies;

        field.resolve = async (parent: any, args: any, context: RequestContext, info: GraphQLResolveInfo) => {
            if (!context.ignorePolicies) {
                const executor = new PolicyExecutor(policies, parent, args, context, info);
                await executor.validatePolicies();
            }

            return originalResolve.call(field, parent, args, context, info);
        };
    }
}

export const sdl = gql`
    input PolicyDirectivePolicy {
        namespace: String!
        name: String!
        args: JSONObject
    }

    directive @policy(policies: [PolicyDirectivePolicy!]!) on FIELD_DEFINITION
`;
