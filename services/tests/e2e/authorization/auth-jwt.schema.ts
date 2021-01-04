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
      role: { type: 'String', default: '{source.role}' },
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
      allowedName: { type: 'String' },
      jwtName: { type: 'String', default: '{jwt?.name}' },
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
      lastName: String @policy(namespace: "auth_jwt", name: "onlyAdmin")
      role: String
    }

    type UserIgnoreRole {
      firstName: String
      lastName: String @policy(namespace: "auth_jwt", name: "onlyAdmin", args: { role: "admin" })
      role: String
    }

    type ArbitraryData {
      arbitraryField: String @policy(
        namespace: "auth_jwt",
        name: "jwtName",
        args: { allowedName: "Varg" }
      )
    }

    type Query {
      user: User! @localResolver(value: ${userQueryStub('normal')})
      userAdmin: User! @localResolver(value: ${userQueryStub('admin')})
      userIgnoreRole: UserIgnoreRole! @localResolver(value: ${userQueryStub('normal')})
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
