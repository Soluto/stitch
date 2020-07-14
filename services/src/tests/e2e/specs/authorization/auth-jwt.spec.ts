import { GraphQLClient } from 'graphql-request';
import { sign as signJwt } from 'jsonwebtoken';
import { sleep } from '../../../helpers/utility';
import { createSchemaMutation, createPolicyMutation } from '../../../helpers/registry-request-builder';
import GraphQLErrorSerializer from '../../../utils/graphql-error-serializer';
import { schema, policies, getUserQuery, arbitraryDataQuery } from './auth-jwt.schema';

const gatewayClient = createGatewayClient();
const registryClient = createRegistryClient();

describe('authorization', () => {
  beforeAll(() => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });
  // This is kind of both the "before" section and a test, but it was weird putting a test in an actual before section
  it('creates the policy and schema resources', async () => {
    const policiesResponse: any = await registryClient.request(createPolicyMutation, { policies });
    expect(policiesResponse.updatePolicies.success).toBe(true);

    const schemaResponse: any = await registryClient.request(createSchemaMutation, { schema });
    expect(schemaResponse.updateSchemas.success).toBe(true);

    // Wait for gateway to update before next tests
    await sleep(500);
  });

  it('allows access to a field based on an argument using param injection from source', async () => {
    const response: any = await gatewayClient.request(getUserQuery('userAdmin'));
    expect(response.userAdmin).toEqual({ firstName: 'John', lastName: 'Smith', role: 'admin' });
  });

  it('rejects access to a field when policy test fails, but still returns the other fields', async () => {
    let response;
    try {
      await gatewayClient.request(getUserQuery('user'));
    } catch (err) {
      response = err.response;
    }
    expect(response).toMatchSnapshot();
  });

  it('rejects access to a field based on JWT info when no JWT is sent', async () => {
    let response;
    try {
      await gatewayClient.request(arbitraryDataQuery);
    } catch (err) {
      response = err.response;
    }
    expect(response).toMatchSnapshot();
  });

  it('rejects access to a field based on JWT info', async () => {
    const gatewayClientJwt = createGatewayClient(disallowedJwtOptions());
    let response;
    try {
      await gatewayClientJwt.request(arbitraryDataQuery);
    } catch (err) {
      response = err.response;
    }
    expect(response).toMatchSnapshot();
  });

  it('allows access to a field based on JWT info', async () => {
    const gatewayClientJwt = createGatewayClient(allowedJwtOptions());
    const response: any = await gatewayClientJwt.request(arbitraryDataQuery);
    expect(response).toMatchSnapshot();
  });
});

function allowedJwtOptions() {
  const payload = {
    sub: '1234567890',
    name: 'Varg',
    iat: 1516239022,
  };

  const encodedJwt = signJwt(JSON.stringify(payload), 'e2e-key');
  return { headers: { authorization: `Bearer ${encodedJwt}` } };
}

function disallowedJwtOptions() {
  const payload = {
    name: 'Orm',
    sub: '1234567890',
    iat: 1516239022,
  };
  const encodedJwt = signJwt(JSON.stringify(payload), 'e2e-key');
  return { headers: { authorization: `Bearer ${encodedJwt}` } };
}

function createRegistryClient(options = {}) {
  return new GraphQLClient('http://localhost:8090/graphql', options);
}

function createGatewayClient(options = {}) {
  return new GraphQLClient('http://localhost:8080/graphql', options);
}
