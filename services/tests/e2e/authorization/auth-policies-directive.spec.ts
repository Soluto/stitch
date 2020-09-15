import { GraphQLClient } from 'graphql-request';
import { sleep } from '../../helpers/utility';
import {
  createSchemaMutation,
  createPolicyMutation,
  emptySchema,
  CreatePolicyMutationResponse,
  UpdateSchemasMutationResponse,
} from '../../helpers/registry-request-builder';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { getToken } from '../../helpers/get-token';
import { schema, policies, query } from './auth-policies-directive.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

type Variables = { argA: string; argB: string };

const testCases: [string, Variables][] = [
  [
    'Both policies approved',
    {
      argA: 'Alpha',
      argB: 'Beta',
    },
  ],
  [
    'Both policies rejected',
    {
      argA: 'NotAlpha',
      argB: 'NotBeta',
    },
  ],
  [
    'First policy rejected',
    {
      argA: 'NotAlpha',
      argB: 'Beta',
    },
  ],
  [
    'Second policy rejected',
    {
      argA: 'Alpha',
      argB: 'NotBeta',
    },
  ],
];

describe('Policies directive', () => {
  let defaultAccessToken: string;

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    defaultAccessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${defaultAccessToken}`);
  });

  afterAll(async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: emptySchema(schema),
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Setup policies', async () => {
    const policyResponse: CreatePolicyMutationResponse = await registryClient.request(createPolicyMutation, {
      policies,
    });
    expect(policyResponse.updatePolicies.success).toBeTruthy();

    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema,
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test.each(testCases)('%s', async (_, variables) => {
    const response = await gatewayClient.request(query, variables).catch(err => err.response);
    expect(response).toMatchSnapshot();
  });
});
