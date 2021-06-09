import { ApolloServer } from 'apollo-server-fastify';
import * as fastify from 'fastify';
import * as corsPlugin from 'fastify-cors';
import * as fastifyMetrics from 'fastify-metrics';
import * as jwtPlugin from 'fastify-jwt';
import * as authPlugin from 'fastify-auth';
import * as config from './modules/config';
import { RegistryRequestContext, resolvers, typeDefs } from './modules/registry-schema';
import logger, { createChildLogger } from './modules/logger';
import * as opaHelper from './modules/opa-helper';
import { handleSignals, handleUncaughtErrors } from './modules/shutdown-handler';
import { loadPlugins } from './modules/plugins';
import { ActiveDirectoryAuth } from './modules/upstreams';
import { anonymousPlugin, authStrategies, getSecret, jwtDecoderPlugin } from './modules/authentication';
import applyCertificates from './modules/certs/apply-ceritficates';

const sLogger = createChildLogger(logger, 'http-server');

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

  sLogger.info('Stitch registry booting up...');
  await loadPlugins();
  applyCertificates();
  

  await app.start();

  const server = fastify();
  server
    .register(corsPlugin as any, config.corsConfiguration)
    .register(authPlugin)
    .register(jwtPlugin, {
      secret: getSecret,
      verify: {
        algorithms: ['RS256'],
      },
    })
    .register(jwtDecoderPlugin)
    .register(anonymousPlugin)
    .register(app.createHandler({ path: '/graphql' }))
    .register(fastifyMetrics, { endpoint: '/metrics' });

  server.after(() => {
    server.addHook('onRequest', server.auth(authStrategies));
    server.addHook('onClose', () => app.stop());
  });

  sLogger.info('Stitch registry is ready to start');
  return server;
}

async function runServer(server: fastify.FastifyInstance) {
  const address = await server.listen(config.httpPort, '0.0.0.0');
  sLogger.info({ address }, 'Stitch registry started');

  handleSignals(() => server.close(() => sLogger.info('Stitch registry stopped successfully')));
  handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  // eslint-disable-next-line promise/catch-or-return
  createServer().then(runServer);
}
