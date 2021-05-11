import { GraphQLClient } from 'graphql-request';
import { updateGatewaySchema } from '../../helpers/utility';
import {
  RegistryMutationResponse,
  updatePoliciesMutation,
  updateSchemasMutation,
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

    const registryAccessToken = await getToken({ scope: 'stitch-registry' });
    registryClient.setHeader('Authorization', `Bearer ${registryAccessToken}`);
  });

  test('Setup policies', async () => {
    const policyResponse = await registryClient.request<RegistryMutationResponse>(updatePoliciesMutation, {
      policies,
    });
    expect(policyResponse.result.success).toBeTruthy();

    const schemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema,
    });
    expect(schemaResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);
  });

  test.each(testCases)('%s', async (_, variables) => {
    const response = await gatewayClient.request(query, variables).catch(err => err.response);
    expect(response).toMatchSnapshot();
  });
});
