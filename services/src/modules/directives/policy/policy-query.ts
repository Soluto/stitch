import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, GraphQLResolveInfo } from 'graphql';
import { gql } from 'apollo-server-core';
import { RequestContext } from '../../context';
import logger from '../../logger';
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

      const logData = {
        name: 'policy-query-directive',
        policy: {
          namespace: policy.namespace,
          name: policy.name,
        },
        type: info.parentType.name,
        field: info.fieldName,
      };
      const policyLogger = logger.child(logData);
      policyLogger.trace('Evaluating policy...');
      const allow = await context.policyExecutor.evaluatePolicy(policy, parent, args, context, info, policyLogger);
      policyLogger.trace({ allow }, 'The policy has been evaluated');
      return { allow };
    };
  }
}

export const sdl = gql`
  directive @policyQuery(namespace: String!, name: String!) on FIELD_DEFINITION
`;
