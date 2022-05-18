import { print } from 'graphql';
import { ApolloServerBase, gql } from 'apollo-server-core';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { beforeEachDispose } from '../before-each-dispose';
import createStitchGateway from '../../../src/modules/apollo-server';
import { ResourceGroup } from '../../../src/modules/resource-repository';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

const testCases: [string, ResourceGroup][] = [
  [
    'Interface',
    {
      schemas: [
        {
          metadata: {
            namespace: 'integration-tests',
            name: 'implicit-test-resolver',
          },
          schema: print(gql`
            interface Foo {
              common: String!
            }

            type Bar implements Foo {
              common: String!
              bar: String!
            }

            type Baz implements Foo {
              common: String!
              baz: String!
            }

            type Query {
              foo: [Foo!]!
                @localResolver(
                  value: [
                    { common: "FOO", bar: "BAR", __typename: "Bar" }
                    { common: "FOO", baz: "BAZ", __typename: "Baz" }
                  ]
                )
            }
          `),
        },
      ],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
    },
  ],
  [
    'Union',
    {
      schemas: [
        {
          metadata: {
            namespace: 'integration-tests',
            name: 'implicit-test-resolver',
          },
          schema: print(gql`
            type Bar {
              bar: String!
            }

            type Baz {
              baz: String!
            }

            union Foo = Bar | Baz

            type Query {
              foo: [Foo!]! @localResolver(value: [{ bar: "BAR", __typename: "Bar" }, { baz: "BAZ", __typename: "Baz" }])
            }
          `),
        },
      ],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
    },
  ],
  [
    'Error when __typename is missing',
    {
      schemas: [
        {
          metadata: {
            namespace: 'integration-tests',
            name: 'implicit-test-resolver',
          },
          schema: print(gql`
            type Bar {
              bar: String!
            }

            type Baz {
              baz: String!
            }

            union Foo = Bar | Baz

            type Query {
              foo: [Foo!]! @localResolver(value: [{ bar: "BAR" }, { baz: "BAZ" }])
            }
          `),
        },
      ],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
    },
  ],
];

describe.each(testCases)('Implicit Type Resolver Tests', (testName, resourceGroup) => {
  const query = gql`
    query {
      foo {
        ... on Bar {
          bar
        }
        ... on Baz {
          baz
        }
      }
    }
  `;

  (getResourceRepository as jest.Mock).mockImplementationOnce(
    jest.fn().mockReturnValueOnce({
      fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
    })
  );

  let server: ApolloServerBase;

  beforeEachDispose(async () => {
    ({ server } = await createStitchGateway());
    return () => {
      return server.stop();
    };
  });

  beforeAll(() => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  test(testName, async () => {
    const response = await server.executeOperation({ query });
    expect(response).toMatchSnapshot();
  });
});
