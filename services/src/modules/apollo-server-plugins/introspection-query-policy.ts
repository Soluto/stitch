import { GraphQLField, SchemaMetaFieldDef, TypeMetaFieldDef } from 'graphql';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import logger from '../logger';
import { RequestContext } from '../context';
import { ResourceGroup } from '../resource-repository';
import { ActiveDirectoryAuth } from '../upstreams/authentication';
import { PolicyExecutor } from '../directives/policy';

export function createIntrospectionQueryPolicyPlugin(): ApolloServerPlugin {
  return {
    serverWillStart() {
      wrapWithPolicyValidation(SchemaMetaFieldDef);
      wrapWithPolicyValidation(TypeMetaFieldDef);
    },
  };
}

function wrapWithPolicyValidation(field: GraphQLField<unknown, RequestContext>) {
  const originalResolver = field.resolve;

  field.resolve = function (source, args, context, info) {
    function callOriginal() {
      return originalResolver!.call(field, source, args, context, info);
    }

    if (!context) {
      // Apollo is sending introspection queries to generate schema hash, we can't and don't want to block that.
      return callOriginal();
    }

    const {
      resourceGroup: { introspectionQueryPolicy, basePolicy },
      policyExecutor,
    } = (context as unknown) as RequestContext;

    let policy = introspectionQueryPolicy;

    if (!policy) {
      logger.trace('Introspection query policy not found, using base policy');
      policy = basePolicy;
    }

    if (!policy) {
      logger.trace('Base policy not found, allowing access by default');
      return callOriginal();
    }

    policyExecutor.validatePolicySync(policy, source, args, context, info);
    return callOriginal();
  };
}

declare module '../context' {
  interface RequestContext {
    resourceGroup: ResourceGroup;
    activeDirectoryAuth: ActiveDirectoryAuth;
    policyExecutor: PolicyExecutor;
  }
}
