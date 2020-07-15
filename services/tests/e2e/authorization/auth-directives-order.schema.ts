import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import { PolicyType, Policy, Schema } from '../../../src/modules/resource-repository';

export const policies: Policy[] = [
  {
    metadata: {
      name: 'alwaysDeny',
      namespace: 'my_ns',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
    `,
  },
];

export const schema: Schema = {
  metadata: {
    name: 'Schema',
    namespace: 'my_ns',
  },
  schema: print(gql`
    type Query {
      foo: String! @stub(value: "bar") @policy(namespace: "my_ns", name: "alwaysDeny")
    }
  `),
};
