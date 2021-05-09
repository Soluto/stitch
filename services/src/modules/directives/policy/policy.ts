import { GraphQLResolveInfo, GraphQLField, defaultFieldResolver, GraphQLObjectType, FieldNode } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { gql } from 'apollo-server-core';
import { RequestContext } from '../../context';
import { GraphQLArguments, Policy } from './types';

export class PolicyDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType<unknown, RequestContext>) {
    const policy = this.args as Policy;
    const originalResolveObject = object.resolveObject;

    object.resolveObject = async (
      source: unknown,
      fields: Record<string, ReadonlyArray<FieldNode>>,
      context: RequestContext,
      info: GraphQLResolveInfo
    ) => {
      if (!policy.postResolve) {
        await context.policyExecutor.validatePolicy(policy, source, {}, context, info);
      }

      const result = originalResolveObject ? await originalResolveObject(source, fields, context, info) : source;

      if (policy.postResolve) {
        await context.policyExecutor.validatePolicy(policy, source, {}, context, info, result);
      }

      return result;
    };
  }

  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const policy = this.args as Policy;
    const originalResolve = field.resolve || defaultFieldResolver;

    field.resolve = async (
      source: unknown,
      args: GraphQLArguments,
      context: RequestContext,
      info: GraphQLResolveInfo
    ) => {
      if (!policy.postResolve) {
        await context.policyExecutor.validatePolicy(policy, source, args, context, info);
      }

      const result = await originalResolve.call(field, source, args, context, info);
      if (policy.postResolve) {
        await context.policyExecutor.validatePolicy(policy, source, args, context, info, result);
      }

      return result;
    };
  }
}

export const sdl = gql`
  directive @policy(
    namespace: String!
    name: String!
    args: JSONObject
    postResolve: Boolean = false
  ) on OBJECT | FIELD_DEFINITION
`;
