import * as fastify from 'fastify';
import * as corsPlugin from 'fastify-cors';
import * as fastifyMetrics from 'fastify-metrics';
import * as jwtPlugin from 'fastify-jwt';
import * as authPlugin from 'fastify-auth';
import * as config from './modules/config';
import logger, { createChildLogger } from './modules/logger';
import { handleSignals, handleUncaughtErrors } from './modules/shutdown-handler';
import createStitchGateway from './modules/apollo-server';
import { getSecret, anonymousPlugin, jwtDecoderPlugin, authStrategies } from './modules/authentication';
import { loadPlugins } from './modules/plugins';
import { initializeMetrics } from './modules/apollo-server-plugins/metrics';
import { contentTypeFilterMiddleware } from './modules/fastify-middlewares';
import applyCertificates from './modules/certs/apply-ceritficates';

const sLogger = createChildLogger(logger, 'http-server');

export async function createServer() {
  sLogger.info('Stitch gateway booting up...');

  await loadPlugins();
  applyCertificates();

  const { server, updateSchema } = await createStitchGateway({
    tracing: config.enableGraphQLTracing,
    playground: config.enableGraphQLPlayground,
    introspection: config.enableGraphQLIntrospection,
  });
  const appWithMiddlewares = fastify();
  appWithMiddlewares.use(contentTypeFilterMiddleware);
  const app = appWithMiddlewares
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
    .register(fastifyMetrics, {
      endpoint: '/metrics',
    })
    .register(server.createHandler({ path: '/graphql' }));

  app.after(() => {
    app.addHook('onRequest', app.auth(authStrategies));
    app.addHook('onClose', () => server.stop());
  });

  app.get('/health', {}, (_, reply) => {
    reply.status(200).send('OK');
  });

  app.post('/updateSchema', {}, async (_, replay) => {
    await updateSchema();
    replay.status(200).send('OK');
  });

  sLogger.info('Stitch gateway is ready to start');
  return app;
}

async function runServer(app: fastify.FastifyInstance) {
  const address = await app.listen(config.httpPort, '0.0.0.0');
  initializeMetrics(app.metrics.client);
  sLogger.info({ address }, 'Stitch gateway started');

  handleSignals(() => app.close(() => sLogger.info('Stitch gateway stopped successfully')));
  handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  // eslint-disable-next-line promise/catch-or-return
  createServer().then(runServer);
}
