import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep } from '../../helpers/utility';
import {
  createSchemaMutation,
  UpdateSchemasMutationResponse,
  emptySchema,
} from '../../helpers/registry-request-builder';
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

  afterAll(async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: emptySchema(schema),
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Setup schema', async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: schema,
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Check plugins', async () => {
    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });

  test('Plugin crashes', async () => {
    const result = await registryClient
      .request(createSchemaMutation, {
        schema: schemaCrashesPlugin,
      })
      .catch(e => e.response);
    expect(result).toMatchSnapshot();
  });
});
