import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, GraphQLResolveInfo } from 'graphql';
import { gql } from 'apollo-server-core';
import { RequestContext } from '../../context';
import { PolicyResult, Policy } from './types';

export class PolicyQueryDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    field.resolve = async (
      parent: unknown,
      args: Record<string, unknown>,
      context: RequestContext,
      info: GraphQLResolveInfo
    ): Promise<PolicyResult> => {
      const policy: Policy = {
        namespace: this.args.namespace,
        name: this.args.name,
        args: args,
      };

      const allow = await context.authorizationConfig.policyExecutor.evaluatePolicy(
        policy,
        parent,
        args,
        context,
        info
      );
      return { allow };
    };
  }
}

export const sdl = gql`
  directive @policyQuery(namespace: String!, name: String!) on FIELD_DEFINITION
`;
