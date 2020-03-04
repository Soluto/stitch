import * as fastify from 'fastify';
import * as fastifyMetrics from 'fastify-metrics';
import * as config from './modules/config';
import logger from './modules/logger';

import {handleSignals, handleUncaughtErrors} from './modules/shutdownHandler';
import {createStitchGateway} from './modules/gateway';
import {pollForUpdates} from './modules/resource-repository';

async function run() {
    logger.info('Stitch gateway booting up...');

    const {server, dispose} = createStitchGateway({
        resourceGroups: pollForUpdates(config.resourceUpdateInterval),
        tracing: config.enableGraphQLTracing,
        playground: config.enableGraphQLPlayground,
        introspection: config.enableGraphQLIntrospection,
    });

    const app = fastify();
    app.register(fastifyMetrics, {endpoint: '/metrics'});
    app.register(server.createHandler({path: '/graphql'}));
    const address = await app.listen(config.httpPort, '0.0.0.0');
    logger.info({address}, 'Stitch gateway started');

    handleSignals(dispose);
    handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
    run();
}
