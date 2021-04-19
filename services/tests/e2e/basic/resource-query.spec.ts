import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { getToken } from '../../helpers/get-token';
import { ResourceMetadataInput } from '../../../src/modules/registry-schema';
import { PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository';
import { RegistryMutationResponse, updatePoliciesMutation } from '../../helpers/registry-request-builder';
import { updateGatewaySchema } from '../../helpers/utility';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('Basic flow', () => {
  const query = print(gql`
    query($metadata: ResourceMetadataInput!, $fromGatewayResources: Boolean) {
      policy(metadata: $metadata, fromGatewayResources: $fromGatewayResources) {
        code
      }
    }
  `);

  const metadata: ResourceMetadataInput = {
    namespace: 'resource-query',
    name: 'policy1',
  };

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
  });

  test('Query before adding policy', async () => {
    const registryResult = await registryClient.request<{ policy?: PolicyDefinition }>(query, { metadata });
    expect(registryResult.policy).toBeNull();

    const gatewayResult = await registryClient.request<{ policy?: PolicyDefinition }>(query, {
      metadata,
      fromGatewayResources: true,
    });
    expect(gatewayResult.policy).toBeNull();
  });

  test('Add policy and query', async () => {
    const policies: PolicyDefinition[] = [
      {
        metadata,
        type: PolicyType.opa,
        code: `default allow = false`,
      },
    ];

    const updateResponse = await registryClient.request<RegistryMutationResponse>(updatePoliciesMutation, {
      policies,
    });
    expect(updateResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);

    const registryResult = await registryClient.request<{ policy?: PolicyDefinition }>(query, { metadata });
    expect(registryResult.policy).toMatchSnapshot();

    const gatewayResult = await registryClient.request<{ policy?: PolicyDefinition }>(query, {
      metadata,
      fromGatewayResources: true,
    });
    expect(gatewayResult.policy).toMatchSnapshot();
  });

  test('Get gateway resource added by plugin', async () => {
    const gatewayOnlyResourceMetadata: ResourceMetadataInput = {
      namespace: 'plugins',
      name: 'whole-rg-policy',
    };

    const registryResult = await registryClient.request<{ policy?: PolicyDefinition }>(query, {
      metadata: gatewayOnlyResourceMetadata,
    });
    expect(registryResult.policy).toBeNull();

    const gatewayResult = await registryClient.request<{ policy?: PolicyDefinition }>(query, {
      metadata: gatewayOnlyResourceMetadata,
      fromGatewayResources: true,
    });
    expect(gatewayResult.policy).toMatchSnapshot();
  });
});
