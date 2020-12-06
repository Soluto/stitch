import { gql } from 'apollo-server-core';
import { print } from 'graphql';

export const policies = [
  {
    metadata: { namespace: 'ignore-policies', name: 'deny-all' },
    type: 'opa',
    code: `
      default allow = false
    `,
  },
];

export const schema = {
  metadata: { namespace: 'ignore-policies', name: 'schema' },
  schema: print(gql`
    type Query {
      ip_foo: String! @localResolver(value: "FOO") @policy(namespace: "ignore-policies", name: "deny-all")
    }
  `),
};
