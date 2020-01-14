import {ApolloServer} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import {StitchGateway} from './modules/stitchGateway';
import {fetch} from './modules/resource-repository';
import {RESTDirectiveDataSource} from './modules/directives/rest';

async function run() {
    const gateway = new StitchGateway({resources: (await fetch())!}); // TODO Handle optionality here
    const {schema, executor} = await gateway.load();
    const apollo = new ApolloServer({
        schema,
        executor,
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
