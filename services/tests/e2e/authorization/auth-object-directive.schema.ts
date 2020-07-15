import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { Policy, PolicyType, Schema } from '../../../src/modules/resource-repository/types';

export const policies: Policy[] = [
  {
    metadata: {
      name: 'alwaysAllow',
      namespace: 'my_ns',
    },
    type: PolicyType.opa,
    code: `
      default allow = true
    `,
  },
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
    type Foo @policy(namespace: "my_ns", name: "alwaysAllow") {
      bar: String! @stub(value: "BAR")
      baz: String! @stub(value: "BAZ") @policy(namespace: "my_ns", name: "alwaysDeny")
    }

    type Foo2 @policy(namespace: "my_ns", name: "alwaysDeny") {
      bar2: String! @stub(value: "BAR")
    }

    type Query {
      foo: Foo! @stub(value: {})
      foo2: Foo2! @stub(value: {})
    }
  `),
};
