/**
 * This module implements @policy directive
 * The policy directive is implemented by replacing the original field.resolve with the new one that is the wrapping of
 * the original field.resolve method with the policy check before invocation.
 * If the policy returns allow=false response the original method isn't invoked.
 *
 * Note: field.resolve method can be changed by some other factors. (Another directives, extensions, plugins and etc.)
 * The order of the application of these changes is critical for the right request execution.
 *
 * The order is as following:
 * 1) Object type directives (ordered as are set in SDL)
 * 2) Field definition directives (ordered as are set in SDL)
 * 3) Apollo Server Core features (like extensions and plugins)
 *
 * This poses great challenges for the @policy directive implementation.
 * It should wrap the field.resolve method but the method implementation sometimes will be defined after the directive
 * attach event is already proceeded.
 * On other hand the wrapping created by the @policy directive can be wrapped by the extension mechanism of Apollo
 * Server.
 *
 * So the directive is implemented by using twe different tricks.
 * 1) Change field."resolve" from property to property accessor. This allows to handle the code that replaces the
 * "resolve" method after the directory was attached. (See visitFieldDefinition method of PolicyDirective class)
 *
 * 2) The getter of "resolve" property will return Proxy of the "resolve" function. The Proxy will change the apply
 * behavior of the function. Instead of just call the function, the policy check will be done and only if it will pass
 * the function will be called. (See createProxyHandler function)
 *
 * The wrapping with the policy check done in the Proxy so it isn't affected by the "resolve" method replacement on one
 * hand and doesn't affects the wrappings done by other parts of the server
 */

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
import PolicyExecutor from './policy-executor';
import { GraphQLArguments, Policy } from './types';

type ResolveFunction = GraphQLFieldResolver<unknown, RequestContext, { [k: string]: unknown }>;
type GraphQLFieldExt = GraphQLField<unknown, RequestContext, Record<string, any>> & {
  internalResolve: ResolveFunction;
};

/** Using Proxy for resolve function instead of regular wrapping as in @stub or @rest directives ensures that
 * the wrapping will be transparent for get/set operation on the "resolve" property
 */
const createProxyHandler = (policy: Policy): ProxyHandler<ResolveFunction> => ({
  apply: async function (target: ResolveFunction, _thisArg: GraphQLFieldExt, argumentsList: unknown[]) {
    const parent: unknown = argumentsList[0];
    const args: GraphQLArguments = argumentsList[1] as GraphQLArguments;
    const context: RequestContext = argumentsList[2] as RequestContext;
    const info: GraphQLResolveInfo = argumentsList[3] as GraphQLResolveInfo;

    if (!context.policyExecutor) context.policyExecutor = new PolicyExecutor();

    if (!context.ignorePolicies) {
      await context.policyExecutor.validatePolicy(policy, parent, args, context, info);
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

    /** property replaced with property accessor to store the original "resolve" logic (event if it will be set later) */
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
