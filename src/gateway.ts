import {ApolloGateway, LocalGraphQLDataSource, ServiceEndpointDefinition} from '@apollo/gateway';
import {directiveMap} from './directives';
import {ResourceGroup} from './resource-fetcher';
import {buildFederatedSchemaDirectivesHack} from './buildFederatedSchema';
import {gql} from 'apollo-server-core';
import * as baseSchema from './baseSchema';

type LocalGatewayConfig = {
    resources: ResourceGroup;
};

export class StitchGateway extends ApolloGateway {
    constructor(config: LocalGatewayConfig) {
        super({
            serviceList: Object.keys(config.resources.schemas).map(name => ({name, url: `http://graph/${name}`})),
            buildService(definition: ServiceEndpointDefinition) {
                const typeDef = config.resources.schemas[definition.name];
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
    }
}
