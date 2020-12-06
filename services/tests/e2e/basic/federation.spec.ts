import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import { sleep } from '../../helpers/utility';
import {
  createSchemaMutation,
  UpdateSchemasMutationResponse,
  emptySchema,
} from '../../helpers/registry-request-builder';
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

  afterAll(async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: emptySchema(schema1),
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Setup schema', async () => {
    const response1: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: schema1,
    });
    expect(response1.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);

    const response2: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: schema2,
    });
    expect(response2.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Send request', async () => {
    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });
});
