import {ApolloServer, gql, IResolvers} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import pLimit from 'p-limit';

import {fetch, update} from './modules/resource-repository';
import {httpPort} from './modules/config';
import {validateResourceGroup} from './modules/validation';
import {distinct} from './modules/collectionUtils';

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
        validateSchemas(input: [UpdateSchemasInput!]!): Result
        validateUpstreams(input: [UpdateUpstreamsInput!]!): Result
    }

    type Mutation {
        updateSchemas(input: [UpdateSchemasInput!]!): Result
        updateUpstreams(input: [UpdateUpstreamsInput!]!): Result
    }

    # Schemas
    input UpdateSchemasInput {
        metadata: ResourceMetadata!
        schema: String!
    }

    # Upstreams
    enum AuthType {
        ActiveDirectory
    }

    input Auth {
        type: AuthType!
        activeDirectory: ActiveDirectoryAuth!
    }

    input ActiveDirectoryAuth {
        authority: String!
        resource: String!
    }

    input UpdateUpstreamsInput {
        metadata: ResourceMetadata!
        host: String!
        auth: Auth!
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

enum AuthType {
    ActiveDirectory = 'ActiveDirectory',
}

interface Auth {
    type: AuthType;
    activeDirectory: ActiveDirectoryAuth;
}

interface ActiveDirectoryAuth {
    authority: string;
    resource: string;
}

interface UpdateUpstreamsInput {
    metadata: ResourceMetadata;
    host: string;
    auth: Auth;
}

async function validateSchemas(input: UpdateSchemasInput[]) {
    const rg = await fetch();

    const schemas = distinct([...rg.schemas, ...input], s => `${s.metadata.namespace}.${s.metadata.name}`);

    const newRg = {...rg, schemas};

    validateResourceGroup(newRg);

    return newRg;
}

async function validateUpstreams(input: UpdateUpstreamsInput[]) {
    const rg = await fetch();

    const upstreams = distinct([...rg.upstreams, ...input], s => `${s.metadata.namespace}.${s.metadata.name}`);

    const newRg = {...rg, upstreams};

    validateResourceGroup(newRg);

    return newRg;
}

const singleton = pLimit(1);
const resolvers: IResolvers = {
    Query: {
        async validateSchemas(_, args: {input: UpdateSchemasInput[]}) {
            await validateSchemas(args.input);

            return {success: true};
        },
        async validateUpstreams(_, args: {input: UpdateUpstreamsInput[]}) {
            await validateUpstreams(args.input);

            return {success: true};
        },
    },
    Mutation: {
        updateSchemas(_, args: {input: UpdateSchemasInput[]}) {
            return singleton(async () => {
                const rg = await validateSchemas(args.input);

                await update(rg);

                return {success: true};
            });
        },
        updateUpstreams(_, args: {input: UpdateUpstreamsInput[]}) {
            return singleton(async () => {
                const rg = await validateUpstreams(args.input);

                await update(rg);

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
