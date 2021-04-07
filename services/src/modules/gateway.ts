import * as fastify from 'fastify';
import { ApolloServer, Config } from 'apollo-server-fastify';
import { Observable } from 'rxjs';
import { ignorePolicies } from './config';
import { createGraphQLService } from './graphql-service';
import { RESTDirectiveDataSource } from './directives/rest';
import { ResourceGroup } from './resource-repository';
import { ExportTrackingExtension } from './exports';
import getPlugins from './apollo-server-plugins';

export interface GatewayConfig extends Config {
  resourceGroups: Observable<ResourceGroup>;
}

export function createStitchGateway(config: GatewayConfig) {
  const { resourceGroups, ...apolloConfig } = config;
  const gateway = createGraphQLService({ resourceGroups });

  const server = new ApolloServer({
    ...apolloConfig,
    gateway,
    extensions: [() => new ExportTrackingExtension()],
    plugins: getPlugins(),
    subscriptions: false,
    context(request: fastify.FastifyRequest) {
      const ctx = {
        request,
        ignorePolicies,
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
