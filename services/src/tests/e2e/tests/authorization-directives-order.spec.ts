import { GraphQLClient } from 'graphql-request';
import { createSchemaMutation } from '../../helpers/authz-schema';
import { Policy, PolicyType, Schema } from '../../../modules/resource-repository/types';
import { sleep } from '../../helpers/utility';

const policies: Policy[] = [
  {
    metadata: {
      name: 'alwaysDeny',
      namespace: 'my_ns',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
    `,
  },
];

const schema: Schema = {
  metadata: {
    name: 'Schema',
    namespace: 'my_ns',
  },
  schema: `
    type Query {
      foo: String! @stub(value: "bar") @policy(namespace: "my_ns", name: "alwaysDeny")
    }
  `,
};

const createPolicyMutation = `
  mutation CreatePolicy($policies: [PolicyInput!]!) {
    updatePolicies(input: $policies) {
      success
    }
  }`;

interface CreatePolicyMutationResponse {
  updatePolicies: {
    success: boolean;
  };
}

interface UpdateSchemasMutationResponse {
  updateSchemas: {
    success: boolean;
  };
}

describe('Authorization - Policy directive order', () => {
  let gatewayClient: GraphQLClient;
  let registryClient: GraphQLClient;

  beforeAll(() => {
    gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
    registryClient = new GraphQLClient('http://localhost:8090/graphql');
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
    await sleep(500);
  });

  test('Query should return error', async () => {
    try {
      await gatewayClient.request(`
        query {
          foo
        }
      `);
      expect(false).toBeTruthy();
    } catch (e) {
      const response = e.response;
      expect(response).toBeDefined();
      expect(response).toMatchSnapshot({
        extensions: expect.any(Object),
      });
    }
  });
});
