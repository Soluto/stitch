import { GraphQLClient } from 'graphql-request';
import { createSchemaMutation } from '../../helpers/authz-schema';
import { Policy, PolicyType, Schema } from '../../../modules/resource-repository/types';
import { sleep } from '../../helpers/utility';

const policies: Policy[] = [
  {
    metadata: {
      name: 'alwaysDenied',
      namespace: 'namespace',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
        `,
  },
  {
    metadata: {
      name: 'isSenior',
      namespace: 'namespace',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
      allow {
        input.args.hireDate < 2015
      }
    `,
    args: {
      hireDate: 'Int',
    },
  },
  {
    metadata: {
      name: 'notClassified',
      namespace: 'namespace',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
      allow {
        input.query.classifiedDepartments[_].id != input.args.departmentId;
        input.query.policy.namespace___isSenior.allow
      }
    `,
    args: {
      departmentId: 'String',
      hireDate: 'Int',
    },
    query: {
      gql: `
        query($hireDate: Int!) {
          classifiedDepartments {
            id
          },
          policy {
            namespace___isSenior(hireDate: $hireDate) {
              allow
            }
          }
        }
      `,
      variables: {
        hireDate: '{hireDate}',
      },
    },
  },
];

const schema: Schema = {
  metadata: {
    name: 'EmployeeSchema',
    namespace: 'namespace',
  },
  schema: `
    type Department {
      id: String
      name: String
    }
    type Employee {
      id: String
      name: String
      hireDate: Int
      department: Department!
      address: String @policy(
        namespace: "namespace",
        name: "notClassified",
        args: {
          departmentId: "{source.department.id}",
          hireDate: "{source.hireDate}"
        }
      )
    }

    type Query {
      allowedEmployee: Employee! @stub(value: {
        id: "1"
        name: "John Smith"
        address: "Tel Aviv"
        hireDate: 2010
        department: {
          id: "D1"
          name: "Sales"
        }
      })
      deniedEmployee1: Employee! @stub(value: {
        id: "2"
        name: "Mark Zuckerberg",
        department: {
          id: "D1000"
          name: "VIP"
        }
        hireDate: 2010
        address: "Facebook HQ"
      })
      deniedEmployee2: Employee! @stub(value: {
        id: "2"
        name: "Tom Baker",
        department: {
          id: "D2"
          name: "VIP"
        }
        hireDate: 2019
        address: "Atlanta"
      })
      classifiedDepartments: [Department!]! @stub(value: [{
        id: "D1000"
        name: "VIP"
      }]) @policy(namespace: "namespace", name: "alwaysDenied")
    }
  `,
};

const createPolicyMutation = `
  mutation CreatePolicy($policies: [PolicyInput!]!) {
    updatePolicies(input: $policies) {
      success
    }
  }`;

const employeeQuery = (query: string) => `
  query {
    ${query} {
      id
      name
      address
    }
  }
`;

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

interface AllowedEmployeeQueryResponse {
  allowedEmployee: {
    id: string;
    name: string;
    address: string;
  };
}

describe('Authorization with queries', () => {
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

  test('Query allowed employee', async () => {
    // TODO: check classified fails
    try {
      await gatewayClient.request(`query {
              classifiedDepartments {
                  id
                  name
              }
          }`);
    } catch (e) {
      const response = e.response;
      expect(response).toMatchSnapshot({
        extensions: expect.any(Object),
      });
    }

    const response: AllowedEmployeeQueryResponse = await gatewayClient.request(employeeQuery('allowedEmployee'));
    expect(response.allowedEmployee).toMatchSnapshot();
  });

  test('Query denied employee 1', async () => {
    try {
      await gatewayClient.request(employeeQuery('deniedEmployee1'));
      expect(true).toBeFalsy();
    } catch (e) {
      const response = e.response;
      expect(response).toMatchSnapshot({
        extensions: expect.any(Object),
      });
    }
  });

  test('Query denied employee 2', async () => {
    try {
      await gatewayClient.request(employeeQuery('deniedEmployee2'));
      expect(true).toBeFalsy();
    } catch (e) {
      const response = e.response;
      expect(response).toMatchSnapshot({
        extensions: expect.any(Object),
      });
    }
  });
});
