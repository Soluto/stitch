import { GraphQLClient } from 'graphql-request';
import { updateGatewaySchema } from '../../helpers/utility';
import {
  RegistryMutationResponse,
  updateBasePolicyMutation,
  updatePoliciesMutation,
  updateSchemasMutation,
} from '../../helpers/registry-request-builder';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { Policy } from '../../../src/modules/directives/policy/types';
import * as oidcClients from '../config/oidc/clients-configuration.json';
import { getToken } from '../../helpers/get-token';
import { schema, policies, query } from './auth-base-policy.schema';

let gatewayClient: GraphQLClient;
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

const testCases: [string, { ClientId: string }][] = oidcClients
  .filter(c => c.ClientId.startsWith('e2e-base-policy'))
  .map(c => [c.Description, c]);

describe('Authorization - Base policy', () => {
  const basePolicy: Policy = {
    namespace: 'internal',
    name: 'base_policy',
  };

  const defaultBasePolicy: Policy = {
    namespace: 'internal',
    name: 'default_base_policy',
  };

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const registryAccessToken = await getToken({ scope: 'stitch-registry' });
    registryClient.setHeader('Authorization', `Bearer ${registryAccessToken}`);

    const policiesResponse = await registryClient.request<RegistryMutationResponse>(updatePoliciesMutation, {
      policies,
    });
    expect(policiesResponse.result.success).toBeTruthy();

    const schemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema,
    });
    expect(schemaResponse.result.success).toBeTruthy();

    const basePolicyResponse = await registryClient.request<RegistryMutationResponse>(updateBasePolicyMutation, {
      basePolicy,
    });
    expect(basePolicyResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);
  });

  afterAll(async () => {
    const basePolicyResponse = await registryClient.request<RegistryMutationResponse>(updateBasePolicyMutation, {
      basePolicy: defaultBasePolicy,
    });
    expect(basePolicyResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);
  });

  beforeEach(() => {
    gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
  });

  test.each(testCases)('%s', async (_, clientConfig) => {
    const accessToken = await getToken({ clientId: clientConfig.ClientId });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
    const result = await gatewayClient.request(query).catch(err => err.response);
    expect(result).toMatchSnapshot();
  });

  test('Anonymous access', async () => {
    const result = await gatewayClient.request(query).catch(err => err.response);
    expect(result).toMatchSnapshot();
  });
});
