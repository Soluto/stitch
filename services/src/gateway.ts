import * as fastify from 'fastify';
import * as fastifyMetrics from 'fastify-metrics';

import * as config from './modules/config';
import logger from './modules/logger';
import { handleSignals, handleUncaughtErrors } from './modules/shutdownHandler';
import { createStitchGateway } from './modules/gateway';
import {
  pollForUpdates,
  S3ResourceRepository,
  FileSystemResourceRepository,
  ResourceRepository,
  CompositeResourceRepository,
} from './modules/resource-repository';

async function run() {
  logger.info('Stitch gateway booting up...');

  const { server, dispose } = createStitchGateway({
    resourceGroups: pollForUpdates(getResourceRepository(), config.resourceUpdateInterval),
    tracing: config.enableGraphQLTracing,
    playground: config.enableGraphQLPlayground,
    introspection: config.enableGraphQLIntrospection,
  });

  const app = fastify();
  app.register(fastifyMetrics, { endpoint: '/metrics' });
  app.register(server.createHandler({ path: '/graphql' }));
  const address = await app.listen(config.httpPort, '0.0.0.0');
  logger.info({ address }, 'Stitch gateway started');

  handleSignals(dispose);
  handleUncaughtErrors();
}

function getResourceRepository() {
  const repositories: ResourceRepository[] = [];

  if (config.useS3ResourceRepository) {
    repositories.push(S3ResourceRepository.fromEnvironment());
  }

  if (config.useFileSystemResourceRepository) {
    repositories.push(FileSystemResourceRepository.fromEnvironment());
  }

  switch (true) {
    case repositories.length === 0:
      logger.fatal('Must enable at least one resource repository');
      throw new Error('Must enable at least one resource repository');
    case repositories.length === 1:
      return repositories[0];
    default:
      return new CompositeResourceRepository(repositories);
  }
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  run();
}
