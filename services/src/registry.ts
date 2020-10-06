import { ApolloServer } from 'apollo-server-fastify';
import * as fastify from 'fastify';
import * as config from './modules/config';
import { resolvers, typeDefs } from './modules/registry-schema';
import logger from './modules/logger';
import * as opaHelper from './modules/opa-helper';
import { handleSignals, handleUncaughtErrors } from './modules/shutdown-handler';

export const app = new ApolloServer({
  typeDefs,
  resolvers,
  tracing: config.enableGraphQLTracing,
  playground: config.enableGraphQLPlayground,
  introspection: config.enableGraphQLIntrospection,
});

async function run() {
  await opaHelper.initializeForRegistry();

  logger.info('Stitch registry booting up...');

  const server = fastify();
  server.register(app.createHandler({ path: '/graphql' }));
  const address = await server.listen(config.httpPort, '0.0.0.0');
  logger.info({ address }, 'Stitch registry started');

  handleSignals(() => app.stop());
  handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  run();
}
