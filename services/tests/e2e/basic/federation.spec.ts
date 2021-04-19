import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import { updateGatewaySchema } from '../../helpers/utility';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { getToken } from '../../helpers/get-token';
import { schema1, schema2 } from './federation.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('Schema Federation', () => {
  const query = print(gql`
    query {
      quz {
        bar
      }
      baz {
        foo {
          bar
          tar
        }
      }
    }
  `);

  beforeAll(async () => {
    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
  });

  test('Setup schema', async () => {
    const response1 = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema1,
    });
    expect(response1.result.success).toBeTruthy();

    const resp1 = await updateGatewaySchema('http://localhost:8080');
    expect(resp1.status).toEqual(200);

    const response2 = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema2,
    });
    expect(response2.result.success).toBeTruthy();

    const resp2 = await updateGatewaySchema('http://localhost:8080');
    expect(resp2.status).toEqual(200);
  });

  test('Send request', async () => {
    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });
});
