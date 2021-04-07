import * as fastify from 'fastify';
import * as corsPlugin from 'fastify-cors';
import * as fastifyMetrics from 'fastify-metrics';
import * as jwtPlugin from 'fastify-jwt';
import * as authPlugin from 'fastify-auth';
import * as config from './modules/config';
import logger from './modules/logger';
import { handleSignals, handleUncaughtErrors } from './modules/shutdown-handler';
import { createStitchGateway } from './modules/gateway';
import { getResourceRepository, pollForUpdates } from './modules/resource-repository';
import {
  getSecret,
  jwtAuthStrategy,
  anonymousAuthStrategy,
  anonymousPlugin,
  jwtDecoderPlugin,
} from './modules/authentication';
import { loadPlugins } from './modules/plugins';
import { initializeMetrics } from './modules/apollo-server-plugins/metrics';

export async function createServer() {
  logger.info('Stitch gateway booting up...');

  await loadPlugins();

  const { server, dispose } = createStitchGateway({
    resourceGroups: pollForUpdates(getResourceRepository(), config.resourceUpdateInterval),
    tracing: config.enableGraphQLTracing,
    playground: config.enableGraphQLPlayground,
    introspection: config.enableGraphQLIntrospection,
  });

  const app = fastify()
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
    app.addHook('onRequest', app.auth([jwtAuthStrategy, anonymousAuthStrategy]));
  });

  app.get('/health', {}, (_, reply) => {
    reply.status(200).send('OK');
  });

  logger.info('Stitch gateway is ready to start');
  return { app, dispose };
}

async function runServer(app: fastify.FastifyInstance, dispose: () => Promise<void>) {
  const address = await app.listen(config.httpPort, '0.0.0.0');
  initializeMetrics(app.metrics.client);
  logger.info({ address }, 'Stitch gateway started');

  handleSignals(dispose);
  handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  // eslint-disable-next-line promise/catch-or-return
  createServer().then(({ app, dispose }) => runServer(app, dispose));
}
