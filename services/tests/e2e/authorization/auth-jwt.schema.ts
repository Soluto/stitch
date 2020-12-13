import { gql } from 'apollo-server-core';
import { print } from 'graphql';

export const policies = [
  {
    metadata: { namespace: 'auth_jwt', name: 'onlyAdmin' },
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
    metadata: { namespace: 'auth_jwt', name: 'jwtName' },
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
  metadata: { namespace: 'auth_jwt', name: 'user' },
  schema: print(gql`
    type User {
      firstName: String
      lastName: String @policy(namespace: "auth_jwt", name: "onlyAdmin", args: { role: "{source.role}" })
      role: String
    }

    type ArbitraryData {
      arbitraryField: String @policy(
        namespace: "auth_jwt",
        name: "jwtName",
        args: {
          jwtName: "{jwt?.name}",
          allowedName: "Varg"
        }
      )
    }

    type Query {
      user: User! @localResolver(value: ${userQueryStub('normal')})
      userAdmin: User! @localResolver(value: ${userQueryStub('admin')})
      arbitraryData: ArbitraryData! @localResolver(value: { arbitraryField: "arbitraryValue" })
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
