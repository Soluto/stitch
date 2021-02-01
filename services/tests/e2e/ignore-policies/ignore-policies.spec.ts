import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import { sleep } from '../../helpers/utility';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { getToken } from '../../helpers/get-token';
import { schema } from './ignore-policies.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('Ignore Policies', () => {
  const query = print(gql`
    query {
      ip_foo
    }
  `);

  beforeAll(async () => {
    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
  });

  test('Setup schema', async () => {
    const response = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema,
    });
    expect(response.result.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Call gateway', async () => {
    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });
});
