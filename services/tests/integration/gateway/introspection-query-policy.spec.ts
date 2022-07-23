import { DocumentNode, print } from 'graphql';
import { ApolloServerBase, gql } from 'apollo-server-core';
import { getIntrospectionQuery } from 'graphql/utilities';
import createStitchGateway from '../../../src/modules/apollo-server';
import { ResourceGroup, PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository';
import { beforeEachDispose } from '../before-each-dispose';
import { Policy } from '../../../src/modules/directives/policy/types';
import { mockLoadedPolicy } from '../../helpers/opa-utility';
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');

const policies: PolicyDefinition[] = [
  {
    metadata: {
      namespace: 'internal',
      name: 'introspection_query_policy',
    },
    type: PolicyType.opa,
    code: `Rego code`,
  },
];

const introspectionQueryPolicy: Policy = {
  namespace: 'internal',
  name: 'introspection_query_policy',
};

const testCases: [string, ResourceGroup, DocumentNode | string, boolean][] = [
  [
    'Deny on introspection query policy',
    {
      introspectionQueryPolicy,
      policies,
      policyAttachments: {
        ['internal-introspection_query_policy.wasm']: mockLoadedPolicy(false),
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
    'Allow on introspection query policy',
    {
      introspectionQueryPolicy,
      policies,
      policyAttachments: {
        ['internal-introspection_query_policy.wasm']: mockLoadedPolicy(true),
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
    'Allow when no introspection query policy was configured',
    {
      policies,
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
    'Deny on introspection query when using alias',
    {
      introspectionQueryPolicy,
      policies,
      policyAttachments: {
        ['internal-introspection_query_policy.wasm']: mockLoadedPolicy(false),
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
    false,
  ],
];

describe.each(testCases)('Introspection Query Policy Tests', (testName, resourceGroup, query, shouldAllow) => {
  const defaultIntrospectionQuery = getIntrospectionQuery();
  let server: ApolloServerBase;

  beforeEachDispose(async () => {
    (getResourceRepository as jest.Mock).mockImplementation(
      jest.fn().mockReturnValue({
        fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
      })
    );

    ({ server } = await createStitchGateway());
    return () => {
      (getResourceRepository as jest.Mock).mockReset();
      return server.stop();
    };
  });

  test(testName, async () => {
    const { data, errors } = await server.executeOperation({ query: query || defaultIntrospectionQuery });

    if (shouldAllow) {
      expect(JSON.stringify(data)).toMatch('__schema');
    } else {
      expect(errors).toHaveLength(1);
      expect(errors![0].message).toMatch('unauthorized by policy "introspection_query_policy"');
    }
  });
});
