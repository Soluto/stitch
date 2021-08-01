import { GraphQLResolveInfo, SchemaMetaFieldDef, TypeMetaFieldDef } from 'graphql';
import logger from '../logger';
import { RequestContext } from '../context';
import { ResourceGroup } from '../resource-repository';
import { ActiveDirectoryAuth } from '../upstreams/authentication';
import { PolicyExecutor } from '../directives/policy';

const INTROSPECTION_QUERY_FIELD_NAMES = new Set([SchemaMetaFieldDef.name, TypeMetaFieldDef.name]);

function isIntrospectionRequest(info: GraphQLResolveInfo) {
  return INTROSPECTION_QUERY_FIELD_NAMES.has(info.fieldName);
}

export function createIntrospectionQueryPolicyPlugin(): void {
  const originalSchemaMetaFieldResolver = SchemaMetaFieldDef.resolve;

  SchemaMetaFieldDef.resolve = function (source, args, context, info) {
    function callOriginal() {
      return originalSchemaMetaFieldResolver!.call(SchemaMetaFieldDef, source, args, context, info);
    }

    if (!context) {
      // Apollo is sending introspection queries to generate schema hash, we can't and don't want to block that.
      return callOriginal();
    }

    const { resourceGroup, policyExecutor } = (context as unknown) as RequestContext;
    const { introspectionQueryPolicy, basePolicy } = resourceGroup;

    if (isIntrospectionRequest(info)) {
      let policy = introspectionQueryPolicy;

      if (!policy) {
        logger.info('Introspection query policy not found, using base policy');
        policy = basePolicy;
      }

      if (!policy) {
        logger.info('Base policy not found, allowing access by default');
        return callOriginal();
      }

      policyExecutor.validatePolicySync(policy, source, args, context, info);
      return callOriginal();
    }
  };
}

declare module '../context' {
  interface RequestContext {
    resourceGroup: ResourceGroup;
    activeDirectoryAuth: ActiveDirectoryAuth;
    policyExecutor: PolicyExecutor;
  }
}
