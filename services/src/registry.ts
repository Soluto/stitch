import {ApolloServer, gql, IResolvers} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import pLimit from 'p-limit';

import {S3ResourceRepository, ResourceGroup} from './modules/resource-repository';
import * as config from './modules/config';
import {validateResourceGroupOrThrow} from './modules/validation';
import {applyResourceGroupUpdates} from './modules/resource-repository/util';
import logger from './modules/logger';
import {handleSignals, handleUncaughtErrors} from './modules/shutdownHandler';
import {createSchemaConfig} from './modules/graphqlService';

const typeDefs = gql`
    # General
    input ResourceMetadataInput {
        namespace: String!
        name: String!
    }

    type Result {
        success: Boolean!
    }

    input ResourceGroupInput {
        schemas: [SchemaInput!]
        upstreams: [UpstreamInput!]
        upstreamClientCredentials: [UpstreamClientCredentialsInput!]
    }

    type Query {
        validateResourceGroup(input: ResourceGroupInput!): Result
        validateSchemas(input: [SchemaInput!]!): Result
        validateUpstreams(input: [UpstreamInput!]!): Result
        validateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    }

    type Mutation {
        updateResourceGroup(input: ResourceGroupInput!): Result
        updateSchemas(input: [SchemaInput!]!): Result
        updateUpstreams(input: [UpstreamInput!]!): Result
        updateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    }

    # Schemas
    input SchemaInput {
        metadata: ResourceMetadataInput!
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
    input AuthInput {
        type: AuthType!
        activeDirectory: ActiveDirectoryAuthInput!
    }

    input ActiveDirectoryAuthInput {
        authority: String!
        resource: String!
    }

    input UpstreamInput {
        metadata: ResourceMetadataInput!
        host: String!
        auth: AuthInput!
    }

    # Upstream client credentials
    input ActiveDirectoryCredentials {
        authority: String!
        clientId: String!
        clientSecret: String!
    }

    """
    GraphQL doesn't support unions for input types, otherwise this would be a union of different auth types.
    Instead, the AuthType enum indicates which auth type is needed, and there's a property which corresponds to each auth type, which we validate in the registry.
    """
    input UpstreamClientCredentialsInput {
        metadata: ResourceMetadataInput!
        authType: AuthType!
        activeDirectory: ActiveDirectoryCredentials!
    }
`;

interface ResourceMetadataInput {
    namespace: string;
    name: string;
}

interface ResourceGroupInput {
    schemas?: SchemaInput[];
    upstreams?: UpstreamInput[];
    upstreamClientCredentials?: UpstreamClientCredentialsInput[];
}

interface SchemaInput {
    metadata: ResourceMetadataInput;
    schema: string;
}

export enum AuthType {
    ActiveDirectory = 'ActiveDirectory',
}

interface ActiveDirectoryAuthInput {
    authority: string;
    resource: string;
}

interface UpstreamInput {
    metadata: ResourceMetadataInput;
    host: string;
    auth: {
        type: AuthType;
        activeDirectory: ActiveDirectoryAuthInput;
    };
}

interface UpstreamClientCredentialsInput {
    metadata: ResourceMetadataInput;
    authType: AuthType;
    activeDirectory: {
        authority: string;
        clientId: string;
        clientSecret: string;
    };
}

const resourceRepository = S3ResourceRepository.fromEnvironment();

async function fetchAndValidate(updates: Partial<ResourceGroup>): Promise<ResourceGroup> {
    const rg = await resourceRepository.fetchLatest();
    const newRg = applyResourceGroupUpdates(rg, updates);
    validateResourceGroupOrThrow(newRg);
    createSchemaConfig(newRg);

    return newRg;
}

const singleton = pLimit(1);
const resolvers: IResolvers = {
    Query: {
        async validateResourceGroup(_, args: {input: ResourceGroupInput}) {
            await fetchAndValidate(args.input);

            return {success: true};
        },
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
        updateResourceGroup(_, args: {input: ResourceGroupInput}) {
            return singleton(async () => {
                const rg = await fetchAndValidate(args.input);
                await resourceRepository.update(rg);

                return {success: true};
            });
        },
        updateSchemas(_, args: {input: SchemaInput[]}) {
            return singleton(async () => {
                const rg = await fetchAndValidate({schemas: args.input});
                await resourceRepository.update(rg);

                return {success: true};
            });
        },
        updateUpstreams(_, args: {input: UpstreamInput[]}) {
            return singleton(async () => {
                const rg = await fetchAndValidate({upstreams: args.input});
                await resourceRepository.update(rg);

                return {success: true};
            });
        },
        updateUpstreamClientCredentials(_, args: {input: UpstreamClientCredentialsInput[]}) {
            return singleton(async () => {
                const rg = await fetchAndValidate({upstreamClientCredentials: args.input});
                await resourceRepository.update(rg);

                return {success: true};
            });
        },
    },
};

export const app = new ApolloServer({
    typeDefs,
    resolvers,
    tracing: config.enableGraphQLTracing,
    playground: config.enableGraphQLPlayground,
    introspection: config.enableGraphQLIntrospection,
});

async function run() {
    logger.info('Stitch registry booting up...');
    const server = fastify();
    server.register(app.createHandler({path: '/graphql'}));
    const address = await server.listen(config.httpPort, '0.0.0.0');
    logger.info({address}, 'Stitch registry started');

    handleSignals(() => app.stop());
    handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
    run();
}
