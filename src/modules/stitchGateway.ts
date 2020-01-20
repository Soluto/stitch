import {ApolloGateway, LocalGraphQLDataSource, ServiceEndpointDefinition} from '@apollo/gateway';
import {
    gql,
    GraphQLService,
    GraphQLServiceEngineConfig,
    Unsubscriber,
    GraphQLServiceConfig,
    SchemaChangeCallback,
} from 'apollo-server-core';
import {directiveMap} from './directives';
import {ResourceGroup, UpstreamClientCredentials, Upstream} from './resource-repository';
import {buildFederatedSchemaDirectivesHack} from './buildFederatedSchema';
import * as baseSchema from './baseSchema';
import {ActiveDirectoryAuth} from './activeDirectoryAuth';

export function createApolloGateway(rg: ResourceGroup): GraphQLService {
    const schemas = Object.fromEntries(
        rg.schemas.map(schema => {
            const name = `${schema.metadata.namespace}.${schema.metadata.name}`;
            return [name, {schema: schema.schema, url: `http://graph/${name}`, name}];
        })
    );
    const activeDirectoryAuth = new ActiveDirectoryAuth();
    const upstreamsByHost = new Map(rg.upstreams.map(u => [u.host, u]));
    const upstreamClientCredentialsByAuthority = new Map(
        rg.upstreamClientCredentials.map(u => [u.activeDirectory.authority, u])
    );

    const gateway = new ApolloGateway({
        serviceList: Object.values(schemas),
        buildService: (definition: ServiceEndpointDefinition) => {
            const typeDef = schemas[definition.name].schema;
            const typeDefWithBase = gql`
                ${baseSchema.typeDef}
                ${typeDef}
            `;
            const schema = buildFederatedSchemaDirectivesHack({
                typeDef: typeDefWithBase,
                resolvers: baseSchema.resolvers,
                schemaDirectives: directiveMap,
            });
            return new LocalGraphQLDataSource(schema);
        },
    });

    return {
        async load(options: {engine?: GraphQLServiceEngineConfig}): Promise<GraphQLServiceConfig> {
            const config = await gateway.load(options);

            return {
                ...config,
                executor(requestContext) {
                    requestContext.context.upstreams = upstreamsByHost;
                    requestContext.context.upstreamClientCredentials = upstreamClientCredentialsByAuthority;
                    requestContext.context.activeDirectoryAuth = activeDirectoryAuth;

                    return config.executor(requestContext);
                },
            };
        },
        onSchemaChange(callback: SchemaChangeCallback): Unsubscriber {
            return gateway.onSchemaChange(callback);
        },
    };
}

declare module './context' {
    interface RequestContext {
        upstreams: Map<string, Upstream>; // By host
        upstreamClientCredentials: Map<string, UpstreamClientCredentials>; // By authority
        activeDirectoryAuth: ActiveDirectoryAuth;
    }
}
