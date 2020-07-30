import { GraphQLClient } from 'graphql-request';
import * as jwtUtil from 'jsonwebtoken';
import * as NodeRSA from 'node-rsa';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep } from '../../helpers/utility';
import { UpdateSchemasMutationResponse, createSchemaMutation } from '../../helpers/registry-request-builder';
import getToken from '../../helpers/get-token';
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
    const accessToken = await getToken(
      'http://localhost:8070/connect/token',
      'gateway-client-id',
      'gateway-client-secret',
      'stitch-gateway'
    );
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
    const result = await gatewayClient.request(query);
    expect(result).toMatchSnapshot();
  });

  test('Invalid JWT token', async () => {
    const secret = new NodeRSA({ b: 2048 }).exportKey('private');
    const accessToken = jwtUtil.sign({ client_id: 'gateway-client-id', scope: ['stitch-gateway'] }, secret, {
      algorithm: 'RS256',
      issuer: 'http://localhost:8070',
      keyid: 'C1B59DF60057CFB292C4E36CCE329615',
      audience: 'Stitch Gateway',
      jwtid: '248A293C7FA8D9C3BDB021F963344E94',
    });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });
});
