import {ApolloGateway, LocalGraphQLDataSource, ServiceEndpointDefinition} from '@apollo/gateway';
import {gql} from 'apollo-server-core';
import {directiveMap} from './directives';
import {ResourceGroup} from './resource-repository';
import {buildFederatedSchemaDirectivesHack} from './buildFederatedSchema';
import * as baseSchema from './baseSchema';

export function createApolloGateway(rg: ResourceGroup) {
    const schemas = Object.fromEntries(
        rg.schemas.map(schema => {
            const name = `${schema.metadata.namespace}.${schema.metadata.name}`;
            return [name, {schema: schema.schema, url: `http://graph/${name}`, name}];
        })
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

    return gateway;
}
