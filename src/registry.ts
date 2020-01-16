import {ApolloServer, gql, IResolvers} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import pLimit from 'p-limit';

import {fetch, update} from './modules/resource-repository';
import {httpPort} from './modules/config';
import {validateResourceGroup} from './modules/validation';

const typeDefs = gql`
    # General
    input ResourceMetadata {
        namespace: String!
        name: String!
    }

    type Result {
        success: Boolean!
    }

    type Query {
        testSchemas(input: [UpdateSchemasInput!]!): Result
    }

    type Mutation {
        updateSchemas(input: [UpdateSchemasInput!]!): Result
    }

    # Schemas
    input UpdateSchemasInput {
        metadata: ResourceMetadata!
        schema: String!
    }
`;

interface ResourceMetadata {
    namespace: string;
    name: string;
}

interface UpdateSchemasInput {
    metadata: ResourceMetadata;
    schema: string;
}

const singleton = pLimit(1);
const resolvers: IResolvers = {
    Query: {
        async testSchemas(_, args: {input: UpdateSchemasInput[]}) {
            const rg = await fetch();

            const schemas = {
                ...rg.schemas,
                ...Object.fromEntries(
                    args.input.map(resource => [
                        `${resource.metadata.namespace}.${resource.metadata.name}`,
                        resource.schema,
                    ])
                ),
            };

            validateResourceGroup({schemas});

            return {success: true};
        },
    },
    Mutation: {
        updateSchemas(_, args: {input: UpdateSchemasInput[]}) {
            return singleton(async () => {
                const rg = await fetch();

                const schemas = {
                    ...rg.schemas,
                    ...Object.fromEntries(
                        args.input.map(resource => [
                            `${resource.metadata.namespace}.${resource.metadata.name}`,
                            resource.schema,
                        ])
                    ),
                };

                validateResourceGroup({schemas});

                await update({schemas});

                return {success: true};
            });
        },
    },
};

async function run() {
    const apollo = new ApolloServer({
        typeDefs,
        resolvers,
    });

    const app = fastify();
    app.register(apollo.createHandler({path: '/graphql'}));
    const res = await app.listen(httpPort, '0.0.0.0');
    console.log('Server is up at', res);
}

run();
