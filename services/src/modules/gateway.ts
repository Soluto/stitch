import * as fastify from 'fastify';
import { ApolloServer, Config } from 'apollo-server-fastify';
import { ignorePolicies } from './config';
import { createGraphQLService } from './graphql-service';
import { RESTDirectiveDataSource } from './directives/rest';
import { pollForUpdates } from './resource-repository';
import { ExportTrackingExtension } from './exports';
import getPlugins from './apollo-server-plugins';

export function createStitchGateway(apolloConfig?: Config) {
  const resourceGroups = pollForUpdates();
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
