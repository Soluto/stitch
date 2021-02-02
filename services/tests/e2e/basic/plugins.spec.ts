import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep } from '../../helpers/utility';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { getToken } from '../../helpers/get-token';
import { schema, schemaCrashesPlugin } from './plugins.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('Plugins', () => {
  const query = print(gql`
    query {
      pl_foo
      pl_bar
      pl_tar
      pl_new_foo
      pl_new_bar
    }
  `);

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
  });

  test('List plugins', async () => {
    const query = print(gql`
      query {
        plugins {
          name
          version
        }
      }
    `);

    const registryResponse = await registryClient.request(query);
    expect(registryResponse).toMatchSnapshot('registry');

    const gatewayResponse = await gatewayClient.request(query);
    expect(gatewayResponse).toMatchSnapshot('gateway');
  });

  test('Setup schema', async () => {
    const schemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema,
    });
    expect(schemaResponse.result.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Check plugins', async () => {
    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });

  test('Plugin crashes', async () => {
    const result = await registryClient
      .request<RegistryMutationResponse>(updateSchemasMutation, {
        schema: schemaCrashesPlugin,
      })
      .catch(e => e.response);
    expect(result).toMatchSnapshot();
  });
});
