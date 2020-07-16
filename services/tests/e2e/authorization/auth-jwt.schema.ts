import { gql } from 'apollo-server-core';
import { print } from 'graphql';

export const policies = [
  {
    metadata: { namespace: 'ns', name: 'onlyAdmin' },
    type: 'opa',
    code: `
      default allow = false
      allow {
        input.args.role == "admin"
      }
    `,
    args: {
      role: 'String',
    },
  },
  {
    metadata: { namespace: 'ns', name: 'jwtName' },
    type: 'opa',
    code: `
      default allow = false
      allow {
        input.args.allowedName == input.args.jwtName
      }
    `,
    args: {
      allowedName: 'String',
      jwtName: 'String',
    },
  },
];

const userQueryStub = (userRole: string) => `{
  firstName: "John"
  lastName: "Smith"
  role: "${userRole}"
}`;

export const schema = {
  metadata: { namespace: 'ns', name: 'user' },
  schema: print(gql`
    type User {
      firstName: String
      lastName: String @policy(namespace: "ns", name: "onlyAdmin", args: { role: "{source.role}" })
      role: String
    }

    type ArbitraryData {
      arbitraryField: String @policy(
        namespace: "ns",
        name: "jwtName",
        args: {
          jwtName: "{jwt.name}",
          allowedName: "Varg"
        }
      )
    }

    type Query {
      user: User! @stub(value: ${userQueryStub('normal')})
      userAdmin: User! @stub(value: ${userQueryStub('admin')})
      arbitraryData: ArbitraryData! @stub(value: { arbitraryField: "arbitraryValue" })
    }
  `),
};

export const getUserQuery = (queryType: string) =>
  print(gql`
    query {
      ${queryType} {
        firstName
        lastName
        role
      }
    }
  `);

export const arbitraryDataQuery = print(gql`
  query {
    arbitraryData {
      arbitraryField
    }
  }
`);
