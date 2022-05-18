import fastify, { FastifyInstance } from 'fastify';
import corsPlugin from '@fastify/cors';
import * as fastifyMetrics from 'fastify-metrics';
import jwtPlugin from '@fastify/jwt';
import authPlugin from '@fastify/auth';
import * as config from './modules/config';
import logger, { createChildLogger } from './modules/logger';
import { handleSignals, handleUncaughtErrors } from './modules/shutdown-handler';
import createStitchGateway from './modules/apollo-server';
import { getSecret, anonymousPlugin, jwtDecoderPlugin, authStrategies } from './modules/authentication';
import { loadPlugins } from './modules/plugins';
import { initializeMetrics } from './modules/apollo-server-plugins/metrics';
// import { contentTypeFilterMiddleware } from './modules/fastify-middlewares';

const sLogger = createChildLogger(logger, 'http-server');

export async function createServer() {
  sLogger.info('Stitch gateway booting up...');

  await loadPlugins();

  const { server, updateSchema } = await createStitchGateway({
    // tracing: config.enableGraphQLTracing,
    // playground: config.enableGraphQLPlayground,
    introspection: config.enableGraphQLIntrospection,
  });
  const app = fastify();
  // appWithMiddlewares.use(contentTypeFilterMiddleware); FIXME: WHAT TO DO WITH THIS?

  await app
    .register(corsPlugin, config.corsConfiguration)
    .register(authPlugin)
    .register(jwtPlugin, {
      secret: getSecret,
      verify: {
        algorithms: ['RS256'],
      },
    })
    .register(jwtDecoderPlugin)
    .register(anonymousPlugin)
    .register(fastifyMetrics, {
      endpoint: '/metrics',
    })
    .register(server.createHandler({ path: '/graphql', cors: false }));

  app.after(() => {
    app.addHook('onRequest', app.auth(authStrategies));
    app.addHook('onClose', () => server.stop());
  });

  app.get('/health', async (_, reply) => {
    await reply.status(200).send('OK');
  });

  app.post('/updateSchema', async (_, reply) => {
    await updateSchema();
    await reply.status(200).send('OK');
  });

  app.server.keepAliveTimeout = config.keepAliveTimeout || app.server.keepAliveTimeout;

  sLogger.info('Stitch gateway is ready to start');
  return app;
}

async function runServer(app: FastifyInstance) {
  const address = await app.listen(config.httpPort, '0.0.0.0');
  initializeMetrics(app.metrics.client);
  sLogger.info({ address }, 'Stitch gateway started');

  handleSignals(() => app.close(() => sLogger.info('Stitch gateway stopped successfully')));
  handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  // eslint-disable-next-line promise/catch-or-return
  void createServer().then(runServer);
}
