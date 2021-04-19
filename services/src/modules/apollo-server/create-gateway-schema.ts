import { parse } from 'graphql';
import getBaseSchema from '../base-schema';
import { pluginsResolvers, pluginsSdl } from '../plugins';
import { ResourceGroup, Schema } from '../resource-repository';
import { buildPolicyQueryTypeDef, policyFieldSdl } from '../directives/policy';
import { buildSchemaFromFederatedTypeDefs } from './build-federated-schema';

export default async function createGatewaySchema(resourceGroup: ResourceGroup) {
  const schemas = resourceGroup.schemas.length === 0 ? [defaultSchema] : resourceGroup.schemas;
  const policies = resourceGroup.policies ?? [];

  const schemaTypeDefs = schemas.map(s => [`${s.metadata.namespace}/${s.metadata.name}`, parse(s.schema)]);
  const policyQueryTypeDefs = policies.map(p => buildPolicyQueryTypeDef(p));
  const pluginsTypeDefs = ['plugins', pluginsSdl];
  const policyTypeDefs = ['policy', policyFieldSdl];
  const baseSchema = await getBaseSchema();
  const schema = buildSchemaFromFederatedTypeDefs({
    typeDefs: Object.fromEntries([...schemaTypeDefs, ...policyQueryTypeDefs, policyTypeDefs, pluginsTypeDefs]),
    baseTypeDefs: baseSchema.typeDefs,
    resolvers: { ...baseSchema.resolvers, ...pluginsResolvers },
    schemaDirectives: baseSchema.directives,
    schemaDirectivesContext: { resourceGroup },
  });
  return schema;
}

const defaultSchema: Schema = {
  metadata: { namespace: 'internal', name: 'default' },
  schema: 'type Query { default: String! @localResolver(value: "default") }',
};
