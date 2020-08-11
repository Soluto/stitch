import * as fastify from 'fastify';
import * as fastifyMetrics from 'fastify-metrics';
import * as jwtPlugin from 'fastify-jwt';
import * as authPlugin from 'fastify-auth';
import * as config from './modules/config';
import logger from './modules/logger';
import { handleSignals, handleUncaughtErrors } from './modules/shutdown-handler';
import { createStitchGateway } from './modules/gateway';
import {
  pollForUpdates,
  S3ResourceRepository,
  FileSystemResourceRepository,
  ResourceRepository,
  CompositeResourceRepository,
  IResourceRepository,
} from './modules/resource-repository';
import { getSecret, jwtAuthStrategy, anonymousAuthStrategy } from './modules/authentication';
import jwtDecoderPlugin from './modules/authentication/jwt-decoder-plugin';

async function run() {
  logger.info('Stitch gateway booting up...');

  const { server, dispose } = createStitchGateway({
    resourceGroups: pollForUpdates(getResourceRepository(), config.resourceUpdateInterval),
    tracing: config.enableGraphQLTracing,
    playground: config.enableGraphQLPlayground,
    introspection: config.enableGraphQLIntrospection,
  });

  const app = fastify()
    .register(authPlugin)
    .register(jwtPlugin, {
      secret: getSecret,
      verify: {
        algorithms: ['RS256'],
      },
    })
    .register(jwtDecoderPlugin)
    .register(fastifyMetrics, { endpoint: '/metrics' })
    .register(server.createHandler({ path: '/graphql' }));
  app.after(() => {
    app.addHook('onRequest', app.auth([jwtAuthStrategy, anonymousAuthStrategy]));
  });

  const address = await app.listen(config.httpPort, '0.0.0.0');
  logger.info({ address }, 'Stitch gateway started');

  handleSignals(dispose);
  handleUncaughtErrors();
}

function getResourceRepository(): IResourceRepository {
  const repositories: ResourceRepository[] = [];

  if (config.useS3ResourceRepository) {
    repositories.push(S3ResourceRepository.fromEnvironment());
  }

  if (config.useFileSystemResourceRepository) {
    repositories.push(FileSystemResourceRepository.fromEnvironment());
  }

  switch (repositories.length) {
    case 0:
      logger.fatal('Must enable at least one resource repository');
      throw new Error('Must enable at least one resource repository');
    case 1:
      return repositories[0];
    default:
      return new CompositeResourceRepository(repositories);
  }
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  run();
}
