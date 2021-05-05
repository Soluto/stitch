import {
  GraphQLResolveInfo,
  GraphQLField,
  defaultFieldResolver,
  GraphQLObjectType,
  FieldNode,
  GraphQLError,
  GraphQLScalarType,
  Kind,
  ValueNode,
  StringValueNode,
  ObjectValueNode,
} from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { gql } from 'apollo-server-core';
import { GraphQLJSONObject } from 'graphql-type-json';
import { RequestContext } from '../../context';
import logger from '../../logger';
import { GraphQLArguments, Policy } from './types';
import { UnauthorizedByPolicyError } from '.';

const validatePolicies = async (
  policies: Policy[],
  relation: 'AND' | 'OR',
  source: unknown,
  args: GraphQLArguments,
  context: RequestContext,
  info: GraphQLResolveInfo,
  result?: unknown
) => {
  const policiesLogger = logger.child({
    name: 'policies',
    type: info.parentType.name,
    field: info.fieldName,
    policies: policies.map(({ namespace, name }) => ({ namespace, name })),
  });
  policiesLogger.trace('Validating policies...');
  const results = await Promise.allSettled(
    policies.map((p: Policy) => context.policyExecutor.validatePolicy(p, source, args, context, info, result))
  );

  const allApproved = results.every(r => r.status === 'fulfilled');
  const someApproved = results.some(r => r.status === 'fulfilled');

  if ((relation === 'AND' && allApproved) || (relation === 'OR' && someApproved)) {
    policiesLogger.trace('Authorized');
    return;
  }

  const rejectedPolicies = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason);
  const failedPolicies = rejectedPolicies.filter(pe => pe.name !== 'UnauthorizedByPolicyError');
  if (failedPolicies.length > 0) {
    policiesLogger.trace({ failedPolicies }, 'Policies validation failed');
    throw new GraphQLError(failedPolicies.join(', '));
  }
  policiesLogger.trace({ rejectedPolicies }, 'Unauthorized');
  throw new UnauthorizedByPolicyError(rejectedPolicies as UnauthorizedByPolicyError[]);
};

export class PoliciesDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType<unknown, RequestContext>) {
    const { policies, relation, postResolve } = this.args;

    const originalResolveObject = object.resolveObject;

    object.resolveObject = async (
      source: unknown,
      fields: Record<string, ReadonlyArray<FieldNode>>,
      context: RequestContext,
      info: GraphQLResolveInfo
    ) => {
      if (!context.ignorePolicies && !postResolve) {
        await validatePolicies(policies, relation, source, {}, context, info);
      }

      const result = originalResolveObject ? await originalResolveObject(source, fields, context, info) : source;

      if (!context.ignorePolicies && postResolve) {
        await validatePolicies(policies, relation, source, {}, context, info, result);
      }

      return result;
    };
  }

  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const { policies, relation, postResolve } = this.args;
    const originalResolve = field.resolve || defaultFieldResolver;

    field.resolve = async (
      source: unknown,
      args: GraphQLArguments,
      context: RequestContext,
      info: GraphQLResolveInfo
    ) => {
      if (!context.ignorePolicies && !postResolve) {
        await validatePolicies(policies, relation, source, args, context, info);
      }

      const result = originalResolve.call(field, source, args, context, info);

      if (!context.ignorePolicies && postResolve) {
        await validatePolicies(policies, relation, source, args, context, info, result);
      }

      return result;
    };
  }
}

const PolicyDetails = new GraphQLScalarType({
  name: 'PolicyDetails',
  description: 'Policy scalar',
  serialize: JSON.stringify,
  parseValue: JSON.parse,
  parseLiteral(ast: ValueNode, variables: Record<string, unknown> | null | undefined) {
    if (ast.kind !== Kind.OBJECT) {
      throw new GraphQLError('Wrong format for PolicyDetails');
    }
    const obj = ast as ObjectValueNode;
    const namespaceField = obj.fields.find(f => f.name.value === 'namespace');
    const nameField = obj.fields.find(f => f.name.value === 'name');
    const argsField = obj.fields.find(f => f.name.value === 'args');
    return {
      namespace: (namespaceField?.value as StringValueNode).value,
      name: (nameField?.value as StringValueNode).value,
      args: argsField && GraphQLJSONObject.parseLiteral(argsField?.value, variables),
    };
  },
});

export const resolvers = {
  PolicyDetails,
};

export const sdl = gql`
  scalar PolicyDetails

  enum Relation {
    AND
    OR
  }

  directive @policies(
    policies: [PolicyDetails!]!
    relation: Relation = OR
    postResolve: Boolean = false
  ) on OBJECT | FIELD_DEFINITION
`;
