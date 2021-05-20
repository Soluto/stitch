import { EventEmitter } from 'events';
import { GraphQLExecutor, GraphQLService, SchemaChangeCallback } from 'apollo-server-core';
import { execute, GraphQLSchema } from 'graphql';
import type { GraphQLRequestContextExecutionDidStart } from 'apollo-server-types';
import { getResourceRepository, ResourceGroup } from '../resource-repository';
import { ActiveDirectoryAuth } from '../upstreams';
import { PolicyExecutor } from '../directives/policy';
import { RequestContext } from '../context';
import logger, { createChildLogger } from '../logger';
import { resourceUpdateInterval } from '../config';
import createGatewaySchema from './create-gateway-schema';

interface LocalFederationGateway extends GraphQLService {
  updateSchema(): Promise<void>;
}

const SCHEMA_UPDATE_EVENT = 'schema_update';
const eventEmitter = new EventEmitter();
const onSchemaChange = (callback: SchemaChangeCallback) => {
  const uLogger = createChildLogger(logger, 'graphql-schema-changed');
  uLogger.info('Schema was changed');
  eventEmitter.on(SCHEMA_UPDATE_EVENT, callback);
  return () => eventEmitter.off(SCHEMA_UPDATE_EVENT, callback);
};

let intervalHandler: ReturnType<typeof setInterval>;

const policyExecutor = new PolicyExecutor();
const activeDirectoryAuth = new ActiveDirectoryAuth();

let _resourceGroup: ResourceGroup | undefined;
let schema: GraphQLSchema | undefined;

const executor = async <TContext>(requestContext: GraphQLRequestContextExecutionDidStart<TContext>) => {
  const { operationName } = requestContext;
  const eLogger = createChildLogger(logger, 'request-executor', { operationName });
  eLogger.trace('Enriching request context...');
  ((requestContext.context as unknown) as RequestContext).resourceGroup = _resourceGroup!;
  ((requestContext.context as unknown) as RequestContext).activeDirectoryAuth = activeDirectoryAuth;
  ((requestContext.context as unknown) as RequestContext).policyExecutor = policyExecutor;
  eLogger.trace('Executing request...');
  const result = await execute({
    document: requestContext.document,
    schema: schema!,
    contextValue: requestContext.context,
    operationName: requestContext.operationName ?? requestContext.request.operationName,
    variableValues: requestContext.request.variables,
  });
  eLogger.trace('Executed.');
  return result;
};

const stop = async () => {
  clearInterval(intervalHandler);
};

export default function createGraphQLService(): LocalFederationGateway {
  const resourceRepository = getResourceRepository();

  const load = async () => {
    const cLogger = createChildLogger(logger, 'graphql-service-loading');
    cLogger.debug('Graphql service is loading...');
    const { resourceGroup } = await resourceRepository.fetchLatest();
    _resourceGroup = resourceGroup;
    schema = await createGatewaySchema(_resourceGroup);

    intervalHandler = setInterval(updateSchema, resourceUpdateInterval);

    // executor property of return value of load method is not in use anymore in apollo-server-core v2.22.2
    // instead the executor property is in use.
    // eslint-disable-next-line prettier/prettier
    return { schema, executor: (undefined as unknown) as GraphQLExecutor };
  };

  const updateSchema = async () => {
    const { isNew, resourceGroup } = await resourceRepository.fetchLatest();
    if (!isNew) return;

    const uLogger = createChildLogger(logger, 'graphql-schema-update');
    uLogger.info('Loading new resources');
    _resourceGroup = resourceGroup;
    schema = await createGatewaySchema(_resourceGroup);
    eventEmitter.emit(SCHEMA_UPDATE_EVENT, schema);
    uLogger.info('New resources loaded');
  };

  return {
    load,
    onSchemaChange,
    executor,
    stop,
    updateSchema,
  };
}

declare module '../context' {
  interface RequestContext {
    resourceGroup: ResourceGroup;
    activeDirectoryAuth: ActiveDirectoryAuth;
    policyExecutor: PolicyExecutor;
  }
}
