import * as fastify from 'fastify';
import { ApolloServer, Config } from 'apollo-server-fastify';
import { Observable } from 'rxjs';
import { createGraphQLService } from './graphqlService';
import { RESTDirectiveDataSource } from './directives/rest';
import { ResourceGroup } from './resource-repository';
import { ExportTrackingExtension } from './exports';

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
    subscriptions: false,
    context(request: fastify.FastifyRequest) {
      return { request };
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

declare module './context' {
  interface RequestContext {
    request: fastify.FastifyRequest;
  }
}
