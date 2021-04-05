import { ApolloServer } from 'apollo-server-fastify';
import * as fastify from 'fastify';
import * as fastifyMetrics from 'fastify-metrics';
import * as config from './modules/config';
import { RegistryRequestContext, resolvers, typeDefs } from './modules/registry-schema';
import logger from './modules/logger';
import * as opaHelper from './modules/opa-helper';
import { handleSignals, handleUncaughtErrors } from './modules/shutdown-handler';
import { loadPlugins } from './modules/plugins';
import { ActiveDirectoryAuth } from './modules/upstreams';
import { jwtDecoderPlugin } from './modules/authentication';

export const app = new ApolloServer({
  typeDefs,
  resolvers,
  context({ request }) {
    const ctx: RegistryRequestContext = {
      request,
      activeDirectoryAuth: new ActiveDirectoryAuth(),
    };
    return ctx;
  },
  tracing: config.enableGraphQLTracing,
  playground: config.enableGraphQLPlayground,
  introspection: config.enableGraphQLIntrospection,
});

export async function createServer() {
  await opaHelper.initializeForRegistry();

  logger.info('Stitch registry booting up...');
  await loadPlugins();

  await app.start();

  const server = fastify();
  server
    .register(jwtDecoderPlugin)
    .register(app.createHandler({ path: '/graphql' }))
    .register(fastifyMetrics, { endpoint: '/metrics' });

  return server;
}

async function runServer(server: fastify.FastifyInstance) {
  const address = await server.listen(config.httpPort, '0.0.0.0');
  logger.info({ address }, 'Stitch registry started');

  handleSignals(() => app.stop());
  handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  // eslint-disable-next-line promise/catch-or-return
  createServer().then(runServer);
}
