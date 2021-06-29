import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { PolicyDefinition, PolicyType, Schema } from '../../../src/modules/resource-repository/types';

export const policies: PolicyDefinition[] = [
  {
    metadata: {
      name: 'always-denied',
      namespace: 'auth-with-query',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
    `,
  },
  {
    metadata: {
      name: 'always-allow',
      namespace: 'auth-with-query',
    },
    type: PolicyType.opa,
    code: `
      default allow = true
    `,
  },
  {
    metadata: {
      name: 'is-senior',
      namespace: 'auth-with-query',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
      allow {
        input.args.hireDate < 2015
      }
    `,
    args: {
      hireDate: { type: 'Int' },
    },
  },
  {
    metadata: {
      name: 'is-active',
      namespace: 'auth-with-query',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
      allow {
        input.args.active
      }
    `,
    args: {
      active: { type: 'Boolean!', default: '{ true }' },
    },
  },
  {
    metadata: {
      name: 'notClassified',
      namespace: 'auth-with-query',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
      allow {
        input.query.classifiedDepartments[_].id != input.args.departmentId;
        input.query.policy.auth_with_query___is_senior.allow
        input.query.policy.auth_with_query___is_active.allow
      }
    `,
    args: {
      departmentId: { type: 'String!', default: '{source.department.id}' },
      hireDate: { type: 'Int!', default: '{source.hireDate}' },
    },
    query: {
      gql: print(gql`
        query($hireDate: Int!) {
          classifiedDepartments {
            id
          }
          policy {
            auth_with_query___is_senior(hireDate: $hireDate) {
              allow
            }
            auth_with_query___is_active {
              allow
            }
          }
        }
      `),
      variables: {
        hireDate: '{hireDate}',
      },
    },
  },
  {
    metadata: {
      name: 'invalid-query',
      namespace: 'auth-with-query',
    },
    type: PolicyType.opa,
    code: `
      default allow = true
    `,
    query: {
      gql: print(gql`
        query {
          wrongField
        }
      `),
    },
  },
];

export const schema: Schema = {
  metadata: {
    name: 'EmployeeSchema',
    namespace: 'auth-with-query',
  },
  schema: print(gql`
    type Department {
      id: String
      name: String
    }
    type Employee {
      id: String
      name: String
      hireDate: Int
      department: Department!
      address: String @policy(namespace: "auth-with-query", name: "notClassified")
    }

    type Query {
      allowedEmployee: Employee!
        @localResolver(
          value: {
            id: "1"
            name: "John Smith"
            address: "Tel Aviv"
            hireDate: 2010
            department: { id: "D1", name: "Sales" }
          }
        )
      deniedEmployee1: Employee!
        @localResolver(
          value: {
            id: "2"
            name: "Mark Zuckerberg"
            department: { id: "D1000", name: "VIP" }
            hireDate: 2010
            address: "Facebook HQ"
          }
        )
      deniedEmployee2: Employee!
        @localResolver(
          value: {
            id: "2"
            name: "Tom Baker"
            department: { id: "D2", name: "VIP" }
            hireDate: 2019
            address: "Atlanta"
          }
        )
      classifiedDepartments: [Department!]!
        @localResolver(value: [{ id: "D1000", name: "VIP" }])
        @policy(namespace: "auth-with-query", name: "always-denied")

      invalidQuery: String!
        @localResolver(value: "Invalid")
        @policy(namespace: "auth-with-query", name: "invalid-query")
    }
  `),
};

export const employeeQuery = (query: string) =>
  print(gql`
    query {
      ${query} {
        id
        name
        address
      }
    }
  `);

export interface AllowedEmployeeQueryResponse {
  allowedEmployee: {
    id: string;
    name: string;
    address: string;
  };
}
