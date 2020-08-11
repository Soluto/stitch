import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep } from '../../helpers/utility';
import { UpdateSchemasMutationResponse, createSchemaMutation } from '../../helpers/registry-request-builder';
import { getToken, getInvalidToken } from '../../helpers/get-token';
import { schema, query } from './verify-jwt.schema';

describe('Authentication - Verify JWT', () => {
  const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
  const registryClient = new GraphQLClient('http://localhost:8090/graphql');

  beforeAll(() => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  test('Setup policies', async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema,
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Valid JWT token', async () => {
    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
    const result = await gatewayClient.request(query);
    expect(result).toMatchSnapshot();
  });

  test('Invalid JWT token', async () => {
    const accessToken = await getInvalidToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });
});
