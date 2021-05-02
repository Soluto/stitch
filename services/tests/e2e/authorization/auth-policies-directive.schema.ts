import { gql } from 'apollo-server-core';
import { print } from 'graphql';

export const policies = [
  {
    metadata: { namespace: 'auth_policies', name: 'isAlpha' },
    type: 'opa',
    code: `
      default allow = false
      allow {
        input.args.argA == "Alpha"
      }
    `,
    args: {
      argA: { type: 'String', default: '{args.argA || source.argA}' },
    },
  },
  {
    metadata: { namespace: 'auth_policies', name: 'isBeta' },
    type: 'opa',
    code: `
      default allow = false
      allow {
        input.args.argB == "Beta"
      }
    `,
    args: {
      argB: { type: 'String', default: '{args.argB || source.argB}' },
    },
  },
];

export const schema = {
  metadata: { namespace: 'auth_policies', name: 'policies_directive' },
  schema: print(gql`
    type Query {
      pd_foo(argA: String!, argB: String!): String
        @stub(value: "FOO")
        @policies(
          policies: [{ namespace: "auth_policies", name: "isAlpha" }, { namespace: "auth_policies", name: "isBeta" }]
          relation: OR
        )
      pd_bar(argA: String!, argB: String!): String
        @stub(value: "FOO")
        @policies(
          policies: [{ namespace: "auth_policies", name: "isAlpha" }, { namespace: "auth_policies", name: "isBeta" }]
          relation: AND
        )
      pd_baz(argA: String!, argB: String!): PDBaz
        @localResolver(
          value: """
          {{
            argA: args.argA, argB: args.argB
          }}
          """
        )
    }

    type PDBaz
      @policies(
        policies: [{ namespace: "auth_policies", name: "isAlpha" }, { namespace: "auth_policies", name: "isBeta" }]
      ) {
      bazbaz: String @localResolver(value: "BAZBAZ")
    }
  `),
};

export const query = print(gql`
  query PoliciesDirective($argA: String!, $argB: String!) {
    pd_foo(argA: $argA, argB: $argB)
    pd_bar(argA: $argA, argB: $argB)
    pd_baz(argA: $argA, argB: $argB) {
      bazbaz
    }
  }
`);
