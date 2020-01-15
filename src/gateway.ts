import {ApolloServer} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import {map} from 'rxjs/operators';
import {StitchGateway} from './modules/stitchGateway';
import {RESTDirectiveDataSource} from './modules/directives/rest';
import {DelegatingGraphQLService} from './modules/delegatingGraphQLService';
import {pollForUpdates} from './modules/resource-repository';

async function run() {
    const gateway$ = pollForUpdates(2000).pipe(map(rg => new StitchGateway({resources: rg})));
    const gateway = new DelegatingGraphQLService(gateway$);
    const apollo = new ApolloServer({
        gateway,
        subscriptions: false,
        tracing: true,
        dataSources() {
            return {
                rest: new RESTDirectiveDataSource(),
            };
        },
    });

    const app = fastify();
    app.register(apollo.createHandler({path: '/graphql'}));
    const res = await app.listen(8080, '0.0.0.0');
    console.log('Server is up at', res);
}

run();
