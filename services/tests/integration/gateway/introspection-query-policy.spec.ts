import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { DocumentNode, print } from 'graphql';
import { gql } from 'apollo-server-core';
import { getIntrospectionQuery } from 'graphql/utilities';
import createStitchGateway from '../../../src/modules/apollo-server';
import { ResourceGroup, PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository';
import { beforeEachDispose } from '../before-each-dispose';
import { Policy } from '../../../src/modules/directives/policy/types';
import { mockLoadedPolicy } from '../../helpers/opa-utility';
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';
import { UnauthorizedByPolicyError } from '../../../src/modules/directives/policy';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');

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
      namespace: 'internal',
      name: 'introspection_query_policy',
    },
    type: PolicyType.opa,
    code: `Rego code`,
  },
];

const basePolicy: Policy = {
  namespace: 'internal',
  name: 'base_policy',
};

const introspectionQueryPolicy: Policy = {
  namespace: 'internal',
  name: 'introspection_query_policy',
};

const testCases: [string, ResourceGroup & { etag: string }, DocumentNode | string, boolean][] = [
  [
    'Deny on introspection query policy',
    {
      etag: 'etag1',
      basePolicy,
      introspectionQueryPolicy,
      policies,
      policyAttachments: {
        ['internal-introspection_query_policy.wasm']: mockLoadedPolicy(false),
        ['internal-base_policy.wasm']: mockLoadedPolicy(true),
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
              bar: String @localResolver(value: "BAR")
            }
          `),
        },
      ],
    },
    getIntrospectionQuery(),
    true,
  ],
  [
    'Allow on introspection query policy',
    {
      etag: 'etag2',
      basePolicy,
      introspectionQueryPolicy,
      policies,
      policyAttachments: {
        ['internal-introspection_query_policy.wasm']: mockLoadedPolicy(true),
        ['internal-base_policy.wasm']: mockLoadedPolicy(true),
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
              bar: String @localResolver(value: "BAR")
            }
          `),
        },
      ],
    },
    getIntrospectionQuery(),
    false,
  ],
  [
    'Allow on base policy, introspection query not configured',
    {
      etag: 'etag3',
      basePolicy,
      policies,
      policyAttachments: {
        ['internal-base_policy.wasm']: mockLoadedPolicy(true),
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
              bar: String @localResolver(value: "BAR")
            }
          `),
        },
      ],
    },
    getIntrospectionQuery(),
    false,
  ],
  [
    'Deny on introspection query when using alias',
    {
      etag: 'etag3',
      basePolicy,
      introspectionQueryPolicy,
      policies,
      policyAttachments: {
        ['internal-introspection_query_policy.wasm']: mockLoadedPolicy(false),
        ['internal-base_policy.wasm']: mockLoadedPolicy(true),
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
              bar: String @localResolver(value: "BAR")
            }
          `),
        },
      ],
    },
    gql`
      query {
        alias: __schema {
          types {
            name
          }
        }
      }
    `,
    true,
  ],
];

describe.each(testCases)('Introspection Query Policy Tests', (testName, resourceGroup, query, shouldThrow) => {
  let client: ApolloServerTestClient;

  const defaultIntrospectionQuery = getIntrospectionQuery();

  beforeEachDispose(async () => {
    (getResourceRepository as jest.Mock).mockImplementation(
      jest.fn().mockReturnValue({
        fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
      })
    );

    const { server } = await createStitchGateway();
    client = createTestClient(server);

    return () => {
      (getResourceRepository as jest.Mock).mockReset();
      return server.stop();
    };
  });

  test(testName, async () => {
    const promise = client.query({ query: query || defaultIntrospectionQuery });

    if (shouldThrow) {
      await expect(promise).rejects.toThrow(UnauthorizedByPolicyError);
    } else {
      const response = await promise;
      expect(response.data).toMatch('__schema');
    }
  });
});
