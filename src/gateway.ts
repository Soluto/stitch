import {ApolloGateway, LocalGraphQLDataSource, ServiceEndpointDefinition} from '@apollo/gateway';
import {directiveMap} from './directives';
import {ResourceGroup} from './resource-fetcher';
import {buildFederatedSchemaDirectivesHack} from './buildFederatedSchema';

type LocalGatewayConfig = {
    resources: ResourceGroup;
};

export class StitchGateway extends ApolloGateway {
    constructor(config: LocalGatewayConfig) {
        super({
            serviceList: Object.keys(config.resources.schemas).map(name => ({name, url: `http://graph/${name}`})),
            buildService(definition: ServiceEndpointDefinition) {
                const typeDef = config.resources.schemas[definition.name];
                const schema = buildFederatedSchemaDirectivesHack(typeDef, directiveMap);
                return new LocalGraphQLDataSource(schema);
            },
        });
    }
}
