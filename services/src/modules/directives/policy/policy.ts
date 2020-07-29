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
      if (!context.ignorePolicies) {
        await context.authorizationConfig.policyExecutor.validatePolicy(policy, source, {}, context, info);
      }

      return originalResolveObject ? await originalResolveObject(source, fields, context, info) : source;
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
      if (!context.ignorePolicies) {
        await context.authorizationConfig.policyExecutor.validatePolicy(policy, source, args, context, info);
      }

      return originalResolve.call(field, source, args, context, info);
    };
  }
}

export const sdl = gql`
  directive @policy(namespace: String!, name: String!, args: JSONObject) on OBJECT | FIELD_DEFINITION
`;
