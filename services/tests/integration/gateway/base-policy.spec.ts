import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import * as Rx from 'rxjs';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { createStitchGateway } from '../../../src/modules/gateway';
import { ResourceGroup, PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository';
import { beforeEachDispose } from '../before-each-dispose';
import { LoadedPolicy } from '../../../src/modules/directives/policy/opa';
import { Policy } from '../../../src/modules/directives/policy/types';

const createPolicyAttachment = (allow: boolean): LoadedPolicy => ({ evaluate: () => [{ result: { allow } }] });

const policies: PolicyDefinition[] = [
  {
    metadata: {
      namespace: 'internal',
      name: 'base_policy',
    },
    type: PolicyType.opa,
    code: `Rego code`,
  },
  {
    metadata: {
      namespace: 'ns',
      name: 'field_policy',
    },
    type: PolicyType.opa,
    code: `Rego code`,
  },
  {
    metadata: {
      namespace: 'ns',
      name: 'override_base_policy',
    },
    shouldOverrideBasePolicy: true,
    type: PolicyType.opa,
    code: `Rego code`,
  },
];

const basePolicy: Policy = {
  namespace: 'internal',
  name: 'base_policy',
};

const testCases: [string, ResourceGroup & { etag: string }][] = [
  [
    'Deny on base policy, allow on field definition',
    {
      etag: 'etag1',
      basePolicy,
      policies,
      policyAttachments: {
        ['internal-base_policy.wasm']: createPolicyAttachment(false),
        ['ns-field_policy.wasm']: createPolicyAttachment(true),
      },
      upstreams: [],
      upstreamClientCredentials: [],
      schemas: [
        {
          metadata: {
            namespace: 'ns',
            name: 'main',
          },
          schema: print(gql`
            type Query {
              foo: String @stub(value: "FOO") @policy(namespace: "ns", name: "field_policy")
              bar: String @stub(value: "BAR")
            }
          `),
        },
      ],
    },
  ],
  [
    'Allow on base policy, deny on field definition',
    {
      etag: 'etag2',
      basePolicy,
      policies,
      policyAttachments: {
        ['internal-base_policy.wasm']: createPolicyAttachment(true),
        ['ns-field_policy.wasm']: createPolicyAttachment(false),
      },
      upstreams: [],
      upstreamClientCredentials: [],
      schemas: [
        {
          metadata: {
            namespace: 'ns',
            name: 'main',
          },
          schema: print(gql`
            type Query {
              foo: String @stub(value: "FOO") @policy(namespace: "ns", name: "field_policy")
              bar: String @stub(value: "BAR")
            }
          `),
        },
      ],
    },
  ],
  [
    'Allow on base policy, allow on field definition',
    {
      etag: 'etag3',
      basePolicy,
      policies,
      policyAttachments: {
        ['internal-base_policy.wasm']: createPolicyAttachment(true),
        ['ns-override_base_policy.wasm']: createPolicyAttachment(true),
      },
      upstreams: [],
      upstreamClientCredentials: [],
      schemas: [
        {
          metadata: {
            namespace: 'ns',
            name: 'main',
          },
          schema: print(gql`
            type Query {
              foo: String @stub(value: "FOO") @policy(namespace: "ns", name: "override_base_policy")
              bar: String @stub(value: "BAR")
            }
          `),
        },
      ],
    },
  ],
  [
    'Deny on base policy, allow on field definition with overrideBasePolicy',
    {
      etag: 'etag4',
      basePolicy,
      policies,
      policyAttachments: {
        ['internal-base_policy.wasm']: createPolicyAttachment(false),
        ['ns-override_base_policy.wasm']: createPolicyAttachment(true),
      },
      upstreams: [],
      upstreamClientCredentials: [],
      schemas: [
        {
          metadata: {
            namespace: 'ns',
            name: 'main',
          },
          schema: print(gql`
            type Query {
              foo: String @stub(value: "FOO") @policy(namespace: "ns", name: "override_base_policy")
              bar: String @stub(value: "BAR")
            }
          `),
        },
      ],
    },
  ],
];

describe.each(testCases)('Base Policy Tests', (testName, resourceGroup) => {
  let client: ApolloServerTestClient;

  const query = gql`
    query {
      foo
      bar
    }
  `;

  beforeEachDispose(() => {
    const stitch = createStitchGateway({ resourceGroups: Rx.of(resourceGroup) });
    client = createTestClient(stitch.server);

    return () => {
      return stitch.dispose();
    };
  });

  beforeAll(() => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  test(testName, async () => {
    const response = await client.query({ query });
    expect(response).toMatchSnapshot();
  });
});
