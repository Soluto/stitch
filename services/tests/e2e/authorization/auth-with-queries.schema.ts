import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { Policy, PolicyType, Schema } from '../../../src/modules/resource-repository/types';

export const policies: Policy[] = [
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
      gql: print(gql`
        query($hireDate: Int!) {
          classifiedDepartments {
            id
          }
          policy {
            namespace___isSenior(hireDate: $hireDate) {
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
];

export const schema: Schema = {
  metadata: {
    name: 'EmployeeSchema',
    namespace: 'namespace',
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
      address: String
        @policy(
          namespace: "namespace"
          name: "notClassified"
          args: { departmentId: "{source.department.id}", hireDate: "{source.hireDate}" }
        )
    }

    type Query {
      allowedEmployee: Employee!
        @stub(
          value: {
            id: "1"
            name: "John Smith"
            address: "Tel Aviv"
            hireDate: 2010
            department: { id: "D1", name: "Sales" }
          }
        )
      deniedEmployee1: Employee!
        @stub(
          value: {
            id: "2"
            name: "Mark Zuckerberg"
            department: { id: "D1000", name: "VIP" }
            hireDate: 2010
            address: "Facebook HQ"
          }
        )
      deniedEmployee2: Employee!
        @stub(
          value: {
            id: "2"
            name: "Tom Baker"
            department: { id: "D2", name: "VIP" }
            hireDate: 2019
            address: "Atlanta"
          }
        )
      classifiedDepartments: [Department!]!
        @stub(value: [{ id: "D1000", name: "VIP" }])
        @policy(namespace: "namespace", name: "alwaysDenied")
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
