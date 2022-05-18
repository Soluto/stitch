import { ApolloServer, Config } from 'apollo-server-fastify';
import { ignorePolicies } from '../config';
import { RESTDirectiveDataSource } from '../directives/rest';
// import { ExportTrackingExtension } from '../exports';
import getPlugins from '../apollo-server-plugins';
import createGraphQLService from './create-graphql-service';

export interface StitchGatewayService {
  server: ApolloServer;
  updateSchema: () => Promise<void>;
}

export default async function createStitchGateway(apolloConfig?: Config): Promise<StitchGatewayService> {
  const gateway = createGraphQLService();
  const server = new ApolloServer({
    ...apolloConfig,
    gateway,
    // extensions: [() => new ExportTrackingExtension()], // TODO: Replace extensions with a plugin
    plugins: getPlugins(),
    context({ request }) {
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
  await server.start();

  return {
    server,
    updateSchema: async () => {
      await gateway.updateSchema();
    },
  };
}

export { default as createGatewaySchema } from './create-gateway-schema';
