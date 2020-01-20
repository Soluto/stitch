import {ApolloServer} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import {map} from 'rxjs/operators';
import {createApolloGateway} from './modules/stitchGateway';
import {RESTDirectiveDataSource} from './modules/directives/rest';
import {DelegatingGraphQLService} from './modules/delegatingGraphQLService';
import {pollForUpdates} from './modules/resource-repository';
import {resourceUpdateInterval, httpPort} from './modules/config';

async function run() {
    const gateway$ = pollForUpdates(resourceUpdateInterval).pipe(map(createApolloGateway));
    const gateway = new DelegatingGraphQLService(gateway$);
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
    const res = await app.listen(httpPort, '0.0.0.0');
    console.log('Server is up at', res);
}

run();

declare module './modules/context' {
    interface RequestContext {
        request: fastify.FastifyRequest;
    }
}
