import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep } from '../../helpers/utility';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { getToken } from '../../helpers/get-token';
import { schema1, schema2, schema3 } from './hello-world.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('Basic flow', () => {
  const query = print(gql`
    query {
      foo
    }
  `);

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
  });

  test('Setup schema', async () => {
    const response1 = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema1,
    });
    expect(response1.result.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);

    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });

  test('Gateway updates when updating schema in registry', async () => {
    const response2 = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema2,
    });
    expect(response2.result.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);

    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });

  test('Send wrong schema', async () => {
    try {
      await registryClient.request(updateSchemasMutation, {
        schema: schema3,
      });
    } catch (e) {
      expect(e.response).toMatchSnapshot();
    }
  });
});
