import { GraphQLClient } from 'graphql-request';
import { sleep } from '../../helpers/utility';
import {
  createSchemaMutation,
  createPolicyMutation,
  emptySchema,
  UpdateSchemasMutationResponse,
} from '../../helpers/registry-request-builder';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { getToken } from '../../helpers/get-token';
import { schema, policies, getUserQuery, arbitraryDataQuery } from './auth-jwt.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('authorization', () => {
  let defaultAccessToken: string;

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    defaultAccessToken = await getToken();
  });

  beforeEach(() => {
    gatewayClient.setHeader('Authorization', `Bearer ${defaultAccessToken}`);
  });

  // This is kind of both the "before" section and a test, but it was weird putting a test in an actual before section
  it('creates the policy and schema resources', async () => {
    const policiesResponse: any = await registryClient.request(createPolicyMutation, { policies });
    expect(policiesResponse.updatePolicies.success).toBeTruthy();

    const schemaResponse: any = await registryClient.request(createSchemaMutation, { schema });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  afterAll(async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: emptySchema(schema),
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  it('allows access to a field based on an argument using param injection from source', async () => {
    const response = await gatewayClient.request(getUserQuery('userAdmin')).catch(err => err.response);
    expect(response).toMatchSnapshot();
  });

  it('rejects access to a field when policy test fails, but still returns the other fields', async () => {
    const response = await gatewayClient.request(getUserQuery('user')).catch(err => err.response);
    expect(response).toMatchSnapshot();
  });

  it('allows access to a field based on a non-default argument', async () => {
    const response = await gatewayClient.request(getUserQuery('userIgnoreRole')).catch(err => err.response);
    expect(response).toMatchSnapshot();
  });

  it('rejects access to a field based on JWT info when no JWT is sent', async () => {
    const response = await gatewayClient.request(arbitraryDataQuery).catch(err => err.response);
    expect(response).toMatchSnapshot();
  });

  it('rejects access to a field based on JWT info', async () => {
    const accessToken = await getToken({ clientId: 'e2e-jwt-disallowed-client-id' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
    const response = await gatewayClient.request(arbitraryDataQuery).catch(err => err.response);
    expect(response).toMatchSnapshot();
  });

  it('allows access to a field based on JWT info', async () => {
    const accessToken = await getToken({ clientId: 'e2e-jwt-allowed-client-id' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
    const response: any = await gatewayClient.request(arbitraryDataQuery);
    expect(response).toMatchSnapshot();
  });
});
