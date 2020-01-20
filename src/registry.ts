import {ApolloServer, gql, IResolvers} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import pLimit from 'p-limit';

import {fetch, update, ResourceGroup} from './modules/resource-repository';
import {httpPort} from './modules/config';
import {validateResourceGroupOrThrow} from './modules/validation';
import {applyResourceGroupUpdates} from './modules/resource-repository/util';

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
        validateSchemas(input: [SchemaInput!]!): Result
        validateUpstreams(input: [UpstreamInput!]!): Result
        validateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    }

    type Mutation {
        updateSchemas(input: [SchemaInput!]!): Result
        updateUpstreams(input: [UpstreamInput!]!): Result
        updateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    }

    # Schemas
    input SchemaInput {
        metadata: ResourceMetadata!
        schema: String!
    }

    # Upstreams
    enum AuthType {
        ActiveDirectory
    }

    """
    GraphQL doesn't support unions for input types, otherwise this would be a union of different auth types.
    Instead, the AuthType enum indicates which auth type is needed, and there's a property which corresponds to each auth type, which we validate in the registry.
    """
    input Auth {
        type: AuthType!
        activeDirectory: ActiveDirectoryAuth!
    }

    input ActiveDirectoryAuth {
        authority: String!
        resource: String!
    }

    input UpstreamInput {
        metadata: ResourceMetadata!
        host: String!
        auth: Auth!
    }

    input UpstreamClientCredentialsInput {
        metadata: ResourceMetadata!
        auth: Auth!
        clientId: String!
        clientSecret: String!
    }
`;

interface ResourceMetadata {
    namespace: string;
    name: string;
}

interface SchemaInput {
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

interface UpstreamInput {
    metadata: ResourceMetadata;
    host: string;
    auth: Auth;
}

interface UpstreamClientCredentialsInput {
    metadata: ResourceMetadata;
    auth: Auth;
    clientId: string;
    clientSecret: string;
}

async function fetchAndValidate(updates: Partial<ResourceGroup>): Promise<ResourceGroup> {
    const rg = await fetch();
    const newRg = applyResourceGroupUpdates(rg, updates);
    validateResourceGroupOrThrow(newRg);

    return newRg;
}

const singleton = pLimit(1);
const resolvers: IResolvers = {
    Query: {
        async validateSchemas(_, args: {input: SchemaInput[]}) {
            await fetchAndValidate({schemas: args.input});

            return {success: true};
        },
        async validateUpstreams(_, args: {input: UpstreamInput[]}) {
            await fetchAndValidate({upstreams: args.input});

            return {success: true};
        },
        async validateUpstreamClientCredentials(_, args: {input: UpstreamClientCredentialsInput[]}) {
            await fetchAndValidate({upstreamClientCredentials: args.input});

            return {success: true};
        },
    },
    Mutation: {
        updateSchemas(_, args: {input: SchemaInput[]}) {
            return singleton(async () => {
                const rg = await fetchAndValidate({schemas: args.input});
                await update(rg);

                return {success: true};
            });
        },
        updateUpstreams(_, args: {input: UpstreamInput[]}) {
            return singleton(async () => {
                const rg = await fetchAndValidate({upstreams: args.input});
                await update(rg);

                return {success: true};
            });
        },
        updateUpstreamClientCredentials(_, args: {input: UpstreamClientCredentialsInput[]}) {
            return singleton(async () => {
                const rg = await fetchAndValidate({upstreamClientCredentials: args.input});
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
