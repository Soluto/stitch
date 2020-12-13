import { GraphQLClient } from 'graphql-request';
import { sleep } from '../../helpers/utility';
import {
  createSchemaMutation,
  createPolicyMutation,
  UpdateSchemasMutationResponse,
  CreatePolicyMutationResponse,
  UpdateBasePolicyMutationResponse,
  createBasePolicyMutation,
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
    args: {
      role: '{jwt?.role}',
    },
  };

  const defaultBasePolicy: Policy = {
    namespace: 'internal',
    name: 'default_base_policy',
  };

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const policiesResponse: CreatePolicyMutationResponse = await registryClient.request(createPolicyMutation, {
      policies,
    });
    expect(policiesResponse.updatePolicies.success).toBeTruthy();

    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema,
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    const basePolicyResponse: UpdateBasePolicyMutationResponse = await registryClient.request(
      createBasePolicyMutation,
      { basePolicy }
    );
    expect(basePolicyResponse.updateBasePolicy.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  afterAll(async () => {
    const basePolicyResponse: UpdateBasePolicyMutationResponse = await registryClient.request(
      createBasePolicyMutation,
      { basePolicy: defaultBasePolicy }
    );
    expect(basePolicyResponse.updateBasePolicy.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
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
