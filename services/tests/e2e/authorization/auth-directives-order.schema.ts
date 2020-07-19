import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import { PolicyType, Policy, Schema } from '../../../src/modules/resource-repository';

export const policies: Policy[] = [
  {
    metadata: {
      name: 'alwaysDeny',
      namespace: 'auth_directives_order',
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
    namespace: 'auth_directives_order',
  },
  schema: print(gql`
    type Query {
      ado_foo: String! @stub(value: "bar") @policy(namespace: "auth_directives_order", name: "alwaysDeny")
    }
  `),
};
