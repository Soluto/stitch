import { GraphQLClient } from 'graphql-request';
import { updateGatewaySchema } from '../../helpers/utility';
import {
  RegistryMutationResponse,
  updatePoliciesMutation,
  updateSchemasMutation,
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

    const registryAccessToken = await getToken({ scope: 'stitch-registry' });
    registryClient.setHeader('Authorization', `Bearer ${registryAccessToken}`);

    defaultAccessToken = await getToken();
  });

  beforeEach(() => {
    gatewayClient.setHeader('Authorization', `Bearer ${defaultAccessToken}`);
  });

  // This is kind of both the "before" section and a test, but it was weird putting a test in an actual before section
  it('creates the policy and schema resources', async () => {
    const policiesResponse = await registryClient.request<RegistryMutationResponse>(updatePoliciesMutation, {
      policies,
    });
    expect(policiesResponse.result.success).toBeTruthy();

    const schemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, { schema });
    expect(schemaResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);
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
