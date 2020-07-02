import { GraphQLResolveInfo, GraphQLField, defaultFieldResolver } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { gql } from 'apollo-server-core';
import { RequestContext } from '../../context';
import { PolicyExecutor } from './policy-executor';
import { GraphQLArguments, Policy } from './types';

export class PolicyDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const originalResolve = field.resolve || defaultFieldResolver;
    const policy = this.args as Policy;

    field.resolve = async (
      parent: unknown,
      args: GraphQLArguments,
      context: RequestContext,
      info: GraphQLResolveInfo
    ) => {
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
