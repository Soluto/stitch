import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import { PolicyType, PolicyDefinition, Schema } from '../../../src/modules/resource-repository';

export const policies: PolicyDefinition[] = [
  {
    metadata: {
      name: 'test',
      namespace: 'auth_post_resolve',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
      allow {
        input.args.arg1 == "bar"
      }
    `,
    args: {
      arg1: {
        type: 'String!',
        default: `{ result }`,
      },
    },
  },
];

export const schema: Schema = {
  metadata: {
    name: 'Schema',
    namespace: 'auth_directives_order',
  },
  schema: print(gql`
    type Query {
      apv_foo(arg1: String!): String!
        @localResolver(value: "{args.arg1}")
        @policy(namespace: "auth_post_resolve", name: "test", postResolve: true)
    }
  `),
};
