import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { PolicyDefinition, PolicyType, Schema } from '../../../src/modules/resource-repository/types';

export const policies: PolicyDefinition[] = [
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
      bar: String! @localResolver(value: "BAR")
      baz: String! @localResolver(value: "BAZ") @policy(namespace: "auth_object_directive", name: "alwaysDeny")
    }

    type Foo2 @policy(namespace: "auth_object_directive", name: "alwaysDeny") {
      bar2: String! @localResolver(value: "BAR")
    }

    type Query {
      aod_foo: Foo! @localResolver(value: {})
      aod_foo2: Foo2! @localResolver(value: {})
    }
  `),
};
