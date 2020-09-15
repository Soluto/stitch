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
      argA: 'String',
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
      argB: 'String',
    },
  },
];

export const schema = {
  metadata: { namespace: 'auth_policies', name: 'policies_directive' },
  schema: print(gql`
    type Query {
      pd_foo(argA: String!, argB: String!): String!
        @stub(value: "FOO")
        @policies(
          policies: [
            { namespace: "auth_policies", name: "isAlpha", args: { argA: "{args.argA}" } }
            { namespace: "auth_policies", name: "isBeta", args: { argB: "{args.argB}" } }
          ]
          relation: OR
        )
      pd_bar(argA: String!, argB: String!): String!
        @stub(value: "FOO")
        @policies(
          policies: [
            { namespace: "auth_policies", name: "isAlpha", args: { argA: "{args.argA}" } }
            { namespace: "auth_policies", name: "isBeta", args: { argB: "{args.argB}" } }
          ]
          relation: AND
        )
    }
  `),
};

export const query = print(gql`
  query PoliciesDirective($argA: String!, $argB: String!) {
    pd_foo(argA: $argA, argB: $argB)
    pd_bar(argA: $argA, argB: $argB)
  }
`);
