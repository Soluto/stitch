import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import { PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository';

export const policies: PolicyDefinition[] = [
  {
    metadata: {
      namespace: 'internal',
      name: 'default_base_policy',
    },
    type: PolicyType.opa,
    code: `
      default allow = true
    `,
  },
  {
    metadata: {
      namespace: 'internal',
      name: 'base_policy',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
      allow {
        input.args.role == "admin"
      }
    `,
    args: {
      role: 'String',
    },
  },
  {
    metadata: { namespace: 'auth_bp', name: 'regular_policy' },
    type: PolicyType.opa,
    code: `
      default allow = false
      allow {
        input.args.isActive
      }
    `,
    args: {
      isActive: 'Boolean',
    },
  },
  {
    metadata: { namespace: 'auth_bp', name: 'override_base_policy' },
    type: PolicyType.opa,
    shouldOverrideBasePolicy: true,
    code: `
      default allow = false
      allow {
        input.args.isGuest
      }
    `,
    args: {
      isGuest: 'Boolean',
    },
  },
];

export const schema = {
  metadata: { namespace: 'auth_bp', name: 'foo' },
  schema: print(gql`
    type Query {
      bp_foo: String @localResolver(value: "FOO")
      bp_bar: String
        @localResolver(value: "BAR")
        @policy(namespace: "auth_bp", name: "regular_policy", args: { isActive: "{jwt?.isActive}" })
      bp_baz: String
        @localResolver(value: "BAZ")
        @policy(namespace: "auth_bp", name: "override_base_policy", args: { isGuest: "{jwt?.isGuest}" })
    }
  `),
};

export const query = print(gql`
  {
    bp_foo
    bp_bar
    bp_baz
  }
`);
