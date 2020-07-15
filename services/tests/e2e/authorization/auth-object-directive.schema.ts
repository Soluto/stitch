import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { Policy, PolicyType, Schema } from '../../../src/modules/resource-repository/types';

export const policies: Policy[] = [
  {
    metadata: {
      name: 'alwaysAllow',
      namespace: 'auth_object_directive',
    },
    type: PolicyType.opa,
    code: `
      default allow = true
    `,
  },
  {
    metadata: {
      name: 'alwaysDeny',
      namespace: 'auth_object_directive',
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
    namespace: 'auth_object_directive',
  },
  schema: print(gql`
    type Foo @policy(namespace: "auth_object_directive", name: "alwaysAllow") {
      bar: String! @stub(value: "BAR")
      baz: String! @stub(value: "BAZ") @policy(namespace: "auth_object_directive", name: "alwaysDeny")
    }

    type Foo2 @policy(namespace: "auth_object_directive", name: "alwaysDeny") {
      bar2: String! @stub(value: "BAR")
    }

    type Query {
      aod_foo: Foo! @stub(value: {})
      aod_foo2: Foo2! @stub(value: {})
    }
  `),
};
