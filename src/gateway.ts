import {ApolloServer} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import {createStitchGateway} from './modules/stitchGateway';
import {RESTDirectiveDataSource} from './modules/directives/rest';
import {pollForUpdates} from './modules/resource-repository';
import {resourceUpdateInterval, httpPort} from './modules/config';
import logger from './modules/logger';

async function run() {
    const gateway = createStitchGateway({
        resourceGroups: pollForUpdates(resourceUpdateInterval),
    });
    const apollo = new ApolloServer({
        gateway,
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

    const app = fastify();
    app.register(apollo.createHandler({path: '/graphql'}));
    const address = await app.listen(httpPort, '0.0.0.0');
    logger.info({address}, 'Stitch gateway started');
}

run();

declare module './modules/context' {
    interface RequestContext {
        request: fastify.FastifyRequest;
    }
}
