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
      role: {
        type: 'String',
        default: '{jwt?.role}',
      },
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
      isActive: {
        type: 'Boolean',
      },
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
      isGuest: {
        type: 'Boolean',
        default: '{jwt?.isGuest}',
      },
    },
  },
  {
    metadata: { namespace: 'auth_bp', name: 'public_policy' },
    type: PolicyType.opa,
    shouldOverrideBasePolicy: true,
    code: `
      default allow = true
    `,
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
      bp_baz: String @localResolver(value: "BAZ") @policy(namespace: "auth_bp", name: "override_base_policy")
      bp_taz: String @localResolver(value: "TAZ") @policy(namespace: "auth_bp", name: "public_policy")
      bp_qyz: Qyz @localResolver(value: { wer: "WER" }) @policy(namespace: "auth_bp", name: "public_policy")
    }

    type Qyz {
      wer: String!
    }
  `),
};

export const query = print(gql`
  {
    bp_foo
    bp_bar
    bp_baz
    bp_taz
    bp_qyz {
      wer
    }
  }
`);
