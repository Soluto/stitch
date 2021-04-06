import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { getToken } from '../../helpers/get-token';
import { ResourceMetadataInput } from '../../../src/modules/registry-schema';
import { PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository';
import { RegistryMutationResponse, updatePoliciesMutation } from '../../helpers/registry-request-builder';
import { sleep } from '../../helpers/utility';

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

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);

    const registryResult = await registryClient.request<{ policy?: PolicyDefinition }>(query, { metadata });
    expect(registryResult.policy).toMatchSnapshot();

    const gatewayResult = await registryClient.request<{ policy?: PolicyDefinition }>(query, {
      metadata,
      fromGatewayResources: true,
    });
    expect(gatewayResult.policy).toMatchSnapshot();
  }, 10000);

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
