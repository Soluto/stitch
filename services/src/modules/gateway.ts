import * as fastify from 'fastify';
import { ApolloServer, Config } from 'apollo-server-fastify';
import { Observable } from 'rxjs';
import { createGraphQLService } from './graphql-service';
import { RESTDirectiveDataSource } from './directives/rest';
import { ResourceGroup } from './resource-repository';
import { ExportTrackingExtension } from './exports';
import {
  createBasicPolicyPlugin,
  createLoggingPlugin,
  createMetricsPlugin,
  createArgumentInjectionPlugin,
} from './plugins';

export interface GatewayConfig extends Config {
  resourceGroups: Observable<ResourceGroup>;
  fastifyInstance: Pick<fastify.FastifyInstance, 'metrics'>;
}

export function createStitchGateway(config: GatewayConfig) {
  const { resourceGroups, fastifyInstance, ...apolloConfig } = config;
  const gateway = createGraphQLService({ resourceGroups });
  const server = new ApolloServer({
    ...apolloConfig,
    gateway,
    extensions: [() => new ExportTrackingExtension()],
    plugins: [
      createBasicPolicyPlugin,
      createLoggingPlugin(),
      createMetricsPlugin(fastifyInstance),
      createArgumentInjectionPlugin(),
    ],
    subscriptions: false,
    context(request: fastify.FastifyRequest) {
      const ctx = {
        request,
      };
      return ctx;
    },
    dataSources() {
      return {
        rest: new RESTDirectiveDataSource(),
      };
    },
  });

  return {
    server,
    dispose: async () => {
      await server.stop();
      gateway.dispose();
    },
  };
}
