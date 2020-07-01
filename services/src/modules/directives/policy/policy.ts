import {GraphQLResolveInfo} from 'graphql';
import {RequestContext} from '../../context';
import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField, defaultFieldResolver} from 'graphql';
import {gql} from 'apollo-server-core';
import {PolicyExecutor} from './policy-executor';
import {Policy} from './types';

export class PolicyDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const originalResolve = field.resolve || defaultFieldResolver;
        const policy = this.args as Policy;

        field.resolve = async (parent: any, args: any, context: RequestContext, info: GraphQLResolveInfo) => {
            if (!context.ignorePolicies) {
                await PolicyExecutor.validatePolicy(policy, parent, args, context, info);
            }

            return originalResolve.call(field, parent, args, context, info);
        };
    }
}

export const sdl = gql`
    directive @policy(namespace: String!, name: String!, args: JSONObject) on FIELD_DEFINITION
`;
