import { Unsubscriber, GraphQLServiceConfig, SchemaChangeCallback, gql } from 'apollo-server-core';
import { parse, execute, DocumentNode } from 'graphql';
import { Observable, Subscription } from 'rxjs';
import { shareReplay, map, mergeMap, take, tap, catchError, skip } from 'rxjs/operators';
import type { GraphQLRequestContextExecutionDidStart } from 'apollo-server-types';
import { ResourceGroup, PolicyDefinition, Schema, ResourceMetadata } from './resource-repository';
import { buildSchemaFromFederatedTypeDefs } from './build-federated-schema';
import getBaseSchema from './base-schema';
import logger from './logger';
import { ActiveDirectoryAuth } from './upstreams';
import { PolicyExecutor } from './directives/policy';
import { pluginsResolvers, pluginsSdl } from './plugins';

export function createGraphQLService(config: { resourceGroups: Observable<ResourceGroup> }) {
  let currentSchemaConfig: GraphQLServiceConfig;

  const subscription = new Subscription();
  const newSchemaConfigs = config.resourceGroups.pipe(
    tap(() => logger.info('Loading new resources')),
    mergeMap(createSchemaConfig),
    catchError((error, obs) => {
      logger.error(error, 'Error creating schema config');
      return obs.pipe(skip(1));
    }),
    shareReplay(1)
  );
  const startListening = () =>
    newSchemaConfigs.subscribe((schemaConfig: GraphQLServiceConfig) => {
      currentSchemaConfig = schemaConfig;
      logger.info('New resources loaded');
    });

  return {
    async load(): Promise<GraphQLServiceConfig> {
      subscription.add(startListening());
      currentSchemaConfig = await newSchemaConfigs.pipe(take(1)).toPromise();

      return {
        schema: currentSchemaConfig.schema,
        executor(requestContext) {
          return currentSchemaConfig!.executor(requestContext);
        },
      };
    },
    onSchemaChange(callback: SchemaChangeCallback): Unsubscriber {
      const sub = newSchemaConfigs.pipe(map(sc => sc.schema)).subscribe(callback);
      subscription.add(sub);

      return sub.unsubscribe.bind(sub);
    },
    executor<TContext>(requestContext: GraphQLRequestContextExecutionDidStart<TContext>) {
      return currentSchemaConfig!.executor(requestContext);
    },
    dispose() {
      subscription.unsubscribe();
    },
  };
}

function buildPolicyGqlQuery(policy: PolicyDefinition): DocumentNode {
  const argStr = policy.args
    ? `(${Object.entries(policy.args)
        .map(([argName, { type }]) => `${argName}: ${type}`)
        .join(',')})`
    : '';

  return gql`
    extend type Policy {
        ${getPolicyQueryName(policy.metadata)}${argStr}: PolicyResult!
          @policyQuery(namespace: "${policy.metadata.namespace}", name: "${policy.metadata.name}")
    }
  `;
}

export async function createSchemaConfig(resourceGroup: ResourceGroup): Promise<GraphQLServiceConfig> {
  const schemas = resourceGroup.schemas.length === 0 ? [defaultSchema] : [initialSchema, ...resourceGroup.schemas];
  const policies = resourceGroup.policies ?? [];

  const schemaTypeDefs = schemas.map(s => [`${s.metadata.namespace}/${s.metadata.name}`, parse(s.schema)]);
  const policyQueryTypeDefs = policies.map(p => [getPolicyQueryName(p.metadata), buildPolicyGqlQuery(p)]);
  const pluginsTypeDefs = ['plugins', pluginsSdl];
  const baseSchema = await getBaseSchema();
  const schema = buildSchemaFromFederatedTypeDefs({
    typeDefs: Object.fromEntries([...schemaTypeDefs, ...policyQueryTypeDefs, pluginsTypeDefs]),
    baseTypeDefs: baseSchema.typeDefs,
    resolvers: { ...baseSchema.resolvers, ...pluginsResolvers },
    schemaDirectives: baseSchema.directives,
    schemaDirectivesContext: { resourceGroup },
  });

  const policyExecutor = new PolicyExecutor();
  const activeDirectoryAuth = new ActiveDirectoryAuth();

  return {
    schema,
    executor(requestContext) {
      requestContext.context.resourceGroup = resourceGroup;
      requestContext.context.activeDirectoryAuth = activeDirectoryAuth;
      requestContext.context.policyExecutor = policyExecutor;

      return execute({
        document: requestContext.document,
        schema: schema,
        contextValue: requestContext.context,
        operationName: requestContext.operationName ?? requestContext.request.operationName,
        variableValues: requestContext.request.variables,
      });
    },
  };
}

function getPolicyQueryName({ namespace, name }: ResourceMetadata) {
  return `${namespace}___${name}`.replace(/-/g, '_');
}

const defaultSchema: Schema = {
  metadata: { namespace: 'internal', name: 'default' },
  schema: 'type Query { default: String! @localResolver(value: "default") }',
};

const initialSchema: Schema = {
  metadata: {
    namespace: 'internal',
    name: '__initial__',
  },
  schema: `
    type Query {
        policy: Policy! @localResolver(value: {
            default: {
                allow: true
            }
        })
    }`,
};

declare module './context' {
  interface RequestContext {
    resourceGroup: ResourceGroup;
    activeDirectoryAuth: ActiveDirectoryAuth;
    policyExecutor: PolicyExecutor;
  }
}
