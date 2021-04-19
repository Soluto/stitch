import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import createStitchGateway from '../../../src/modules/apollo-server';
import { ResourceGroup, PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository';
import { beforeEachDispose } from '../before-each-dispose';
import { Policy } from '../../../src/modules/directives/policy/types';
import { mockLoadedPolicy } from '../../helpers/opa-utility';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

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
        ['internal-base_policy.wasm']: mockLoadedPolicy(false),
        ['ns-field_policy.wasm']: mockLoadedPolicy(true),
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
              foo: String @localResolver(value: "FOO") @policy(namespace: "ns", name: "field_policy")
              bar: String @localResolver(value: "BAR")
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
        ['internal-base_policy.wasm']: mockLoadedPolicy(true),
        ['ns-field_policy.wasm']: mockLoadedPolicy(false),
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
              foo: String @localResolver(value: "FOO") @policy(namespace: "ns", name: "field_policy")
              bar: String @localResolver(value: "BAR")
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
        ['internal-base_policy.wasm']: mockLoadedPolicy(true),
        ['ns-override_base_policy.wasm']: mockLoadedPolicy(true),
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
              foo: String @localResolver(value: "FOO") @policy(namespace: "ns", name: "override_base_policy")
              bar: String @localResolver(value: "BAR")
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
        ['internal-base_policy.wasm']: mockLoadedPolicy(false),
        ['ns-override_base_policy.wasm']: mockLoadedPolicy(true),
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
              foo: String @localResolver(value: "FOO") @policy(namespace: "ns", name: "override_base_policy")
              bar: String @localResolver(value: "BAR")
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

  (getResourceRepository as jest.Mock).mockImplementationOnce(
    jest.fn().mockReturnValueOnce({
      fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
    })
  );

  beforeEachDispose(async () => {
    const { server } = await createStitchGateway();
    client = createTestClient(server);

    return () => {
      return server.stop();
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
