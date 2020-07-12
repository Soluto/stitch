import {
  GraphQLResolveInfo,
  GraphQLField,
  defaultFieldResolver,
  GraphQLObjectType,
  GraphQLFieldResolver,
} from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { gql } from 'apollo-server-core';
import { RequestContext } from '../../context';
import { PolicyExecutor } from './policy-executor';
import { GraphQLArguments, Policy } from './types';

type ResolveFunction = GraphQLFieldResolver<unknown, RequestContext, { [k: string]: unknown }>;
type GraphQLFieldExt = GraphQLField<unknown, RequestContext, Record<string, any>> & {
  internalResolve: ResolveFunction;
};

const createProxyHandler = (policy: Policy): ProxyHandler<ResolveFunction> => ({
  apply: async function (target: ResolveFunction, _thisArg: GraphQLFieldExt, argumentsList: unknown[]) {
    const parent: unknown = argumentsList[0];
    const args: GraphQLArguments = argumentsList[1] as GraphQLArguments;
    const context: RequestContext = argumentsList[2] as RequestContext;
    const info: GraphQLResolveInfo = argumentsList[3] as GraphQLResolveInfo;

    if (!context.ignorePolicies) {
      await PolicyExecutor.validatePolicy(policy, parent, args, context, info);
    }

    return target(parent, args, context, info);
  },
});

export class PolicyDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType<unknown, RequestContext>) {
    const fields = object.getFields();
    const fieldDefinitions = object.astNode?.fields;

    if (fieldDefinitions) {
      for (const fd of fieldDefinitions) {
        if (!fd.directives?.some(dd => dd.name.value === 'policy')) {
          const field = fields[fd.name.value];
          this.visitFieldDefinition(field);
        }
      }
    }
  }

  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const handler = createProxyHandler(this.args as Policy);

    const originalResolve = field.resolve || defaultFieldResolver;

    Object.defineProperty(field, 'resolve', {
      set: (newResolve: ResolveFunction) => {
        (field as GraphQLFieldExt).internalResolve = newResolve;
      },
      get: () => {
        return new Proxy((field as GraphQLFieldExt).internalResolve, handler);
      },
    });

    field.resolve = originalResolve;
  }
}

export const sdl = gql`
  directive @policy(namespace: String!, name: String!, args: JSONObject) on OBJECT | FIELD_DEFINITION
`;
