import {ApolloServer} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import {createStitchGateway} from './modules/stitchGateway';
import {RESTDirectiveDataSource} from './modules/directives/rest';
import {pollForUpdates} from './modules/resource-repository';
import {resourceUpdateInterval, httpPort} from './modules/config';
import logger from './modules/logger';
import {ExportTrackingExtension} from './modules/exports';
import {handleSignals, handleUncaughtErrors} from './modules/shutdownHandler';

// exported for integration testing
export function createApolloServer() {
    const gateway = createStitchGateway({resourceGroups: pollForUpdates(resourceUpdateInterval)});
    const server = new ApolloServer({
        gateway,
        extensions: [() => new ExportTrackingExtension()],
        subscriptions: false,
        tracing: true,
        context(request: fastify.FastifyRequest) {
            return {request};
        },
        dataSources() {
            return {
                rest: new RESTDirectiveDataSource(),
            };
        },
    });

    return {
        server,
        dispose: async () => {
            await server.stop();
            gateway.dispose();
        },
    };
}

async function run() {
    logger.info('Stitch gateway booting up...');
    const {server, dispose} = createApolloServer();

    const app = fastify();
    app.register(server.createHandler({path: '/graphql'}));
    const address = await app.listen(httpPort, '0.0.0.0');
    logger.info({address}, 'Stitch gateway started');

    handleSignals(dispose);
    handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
    run();
}

declare module './modules/context' {
    interface RequestContext {
        request: fastify.FastifyRequest;
    }
}
