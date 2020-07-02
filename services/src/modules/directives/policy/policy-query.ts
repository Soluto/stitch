import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, GraphQLResolveInfo } from 'graphql';
import { RequestContext } from '../../context';
import { gql } from 'apollo-server-core';
import { PolicyResult, Policy } from './types';
import { PolicyExecutor } from './policy-executor';

export class PolicyQueryDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    field.resolve = async (
      parent: any,
      args: any,
      context: RequestContext,
      info: GraphQLResolveInfo
    ): Promise<PolicyResult> => {
      const policy: Policy = {
        namespace: this.args.namespace,
        name: this.args.name,
        args: args,
      };

      const allow = await PolicyExecutor.evaluatePolicy(policy, parent, args, context, info);
      return { allow };
    };
  }
}

export const sdl = gql`
  directive @policyQuery(namespace: String!, name: String!) on FIELD_DEFINITION
`;
