import { GraphQLResolveInfo, SchemaMetaFieldDef } from 'graphql';
import { ForbiddenError } from 'apollo-server-core';
import logger from '../logger';
import { RequestContext } from '../context';
import { ResourceGroup } from '../resource-repository';
import { ActiveDirectoryAuth } from '../upstreams/authentication';
import { PolicyExecutor } from '../directives/policy';

const INTROSPECTION_QUERY_FIELD_NAMES = new Set(['__schema', '__type']);

function isIntrospectionRequest(info: GraphQLResolveInfo) {
  return INTROSPECTION_QUERY_FIELD_NAMES.has(info.fieldName);
}

export function createIntrospectionQueryPolicyPlugin(): void {
  const originalSchemaMetaFieldResolver = SchemaMetaFieldDef.resolve;

  SchemaMetaFieldDef.resolve = function (source, args, context, info) {
    const { resourceGroup, policyExecutor } = (context as unknown) as RequestContext;
    const { introspectionQueryPolicy, basePolicy } = resourceGroup;

    if (isIntrospectionRequest(info)) {
      let policy = introspectionQueryPolicy;

      if (!policy) {
        logger.info('Introspection query policy not found, using base policy');
        policy = basePolicy;
      }

      if (!policy) {
        logger.info('Base policy not found, denying access by default');
        throw new ForbiddenError('You are not authorized to perform this request.');
      }

      policyExecutor.validatePolicySync(policy, source, args, context, info);
      return originalSchemaMetaFieldResolver!.call(SchemaMetaFieldDef, source, args, context, info);
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
