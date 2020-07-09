import * as fastify from 'fastify';
import { ApolloServer, Config } from 'apollo-server-fastify';
import { Observable } from 'rxjs';
import { createGraphQLService } from './graphql-service';
import { RESTDirectiveDataSource } from './directives/rest';
import { ResourceGroup } from './resource-repository';
import { ExportTrackingExtension } from './exports';
import { getJwt } from './arguments-injection';

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
      const ctx = {
        request,
        jwt: getJwt(request),
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
