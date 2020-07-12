import { GraphQLClient } from 'graphql-request';
import { createSchemaMutation } from '../../helpers/authz-schema';
import { Policy, PolicyType, Schema } from '../../../modules/resource-repository/types';
import { sleep } from '../../helpers/utility';
import GraphQLErrorSerializer from '../utils/graphql-error-serializer';

const policies: Policy[] = [
  {
    metadata: {
      name: 'alwaysAllow',
      namespace: 'my_ns',
    },
    type: PolicyType.opa,
    code: `
      default allow = true
    `,
  },
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
    type Foo @policy(namespace: "my_ns", name: "alwaysAllow") {
      bar: String! @stub(value: "BAR")
      baz: String! @stub(value: "BAZ") @policy(namespace: "my_ns", name: "alwaysDeny")
    }

    type Foo2 @policy(namespace: "my_ns", name: "alwaysDeny") {
      bar2: String! @stub(value: "BAR")
    }

    type Query {
      foo: Foo! @stub(value: {})
      foo2: Foo2! @stub(value: {})
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

describe('Authorization - Policy directive on Object', () => {
  let gatewayClient: GraphQLClient;
  let registryClient: GraphQLClient;

  beforeAll(() => {
    gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
    registryClient = new GraphQLClient('http://localhost:8090/graphql');

    expect.addSnapshotSerializer(GraphQLErrorSerializer);
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

  test('OK for query field without policy of object with allowed policy', async () => {
    const response = await gatewayClient.request(`
        query {
          foo {
            bar
          }
        }
      `);
    expect(response).toMatchSnapshot();
  });

  test('Error for query field with deny policy of object with allowed policy', async () => {
    try {
      await gatewayClient.request(`
        query {
          foo {
            baz
          }
        }
      `);
      expect(false).toBeTruthy();
    } catch (e) {
      const response = e.response;
      expect(response).toBeDefined();
      expect(response).toMatchSnapshot();
    }
  });

  test('Error for query field without policy of object with deny policy', async () => {
    try {
      await gatewayClient.request(`
        query {
          foo2 {
            bar2
          }
        }
      `);
      expect(false).toBeTruthy();
    } catch (e) {
      const response = e.response;
      expect(response).toBeDefined();
      expect(response).toMatchSnapshot();
    }
  });
});
