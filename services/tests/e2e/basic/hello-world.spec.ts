import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import { sleep } from '../../helpers/utility';
import {
  createSchemaMutation,
  UpdateSchemasMutationResponse,
  emptySchema,
} from '../../helpers/registry-request-builder';
import { schema1, schema2 } from './hello-world.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('Basic flow', () => {
  const query = print(gql`
    query {
      foo
    }
  `);

  afterAll(async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: emptySchema(schema1),
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(500);
  });

  test('Setup schema', async () => {
    const response1: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: schema1,
    });
    expect(response1.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(500);

    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });

  test('Gateway updates when updating schema in registry', async () => {
    const response1: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: schema2,
    });
    expect(response1.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(500);

    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });
});
