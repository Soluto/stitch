import { GraphQLClient } from 'graphql-request';
import { sign as signJwt } from 'jsonwebtoken';
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
import { schema, policies, query } from './auth-base-policy.schema';

let gatewayClient: GraphQLClient;
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

const testCases = [
  [
    'JWT pass none of policies',
    {
      role: 'manager',
      isActive: false,
      isGuest: false,
    },
  ],
  [
    'JWT pass all policies',
    {
      role: 'admin',
      isActive: true,
      isGuest: true,
    },
  ],
  [
    'JWT pass only base policy',
    {
      role: 'admin',
      isActive: false,
      isGuest: false,
    },
  ],
  [
    'JWT pass only regular policy',
    {
      role: 'manager',
      isActive: true,
      isGuest: false,
    },
  ],
  [
    'JWT pass only override policy',
    {
      role: 'manager',
      isActive: false,
      isGuest: true,
    },
  ],
  [
    'JWT pass base and regular policy',
    {
      role: 'admin',
      isActive: true,
      isGuest: false,
    },
  ],
  [
    'JWT pass regular and override policy',
    {
      role: 'manager',
      isActive: true,
      isGuest: true,
    },
  ],
];

describe('Authorization - Base policy', () => {
  const basePolicy: Policy = {
    namespace: 'internal',
    name: 'base_policy',
    args: {
      role: '{jwt.role}',
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
    await sleep(1500);
  });

  afterAll(async () => {
    const basePolicyResponse: UpdateBasePolicyMutationResponse = await registryClient.request(
      createBasePolicyMutation,
      { basePolicy: defaultBasePolicy }
    );
    expect(basePolicyResponse.updateBasePolicy.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(1500);
  });

  test.each(testCases)('%s', async (_, payload) => {
    const encodedJwt = signJwt(JSON.stringify(payload), 'e2e-key');
    const options = { headers: { authorization: `Bearer ${encodedJwt}` } };
    gatewayClient = new GraphQLClient('http://localhost:8080/graphql', options);
    const result = await gatewayClient.request(query).catch(err => err.response);
    expect(result).toMatchSnapshot();
  });
});
