import * as Rx from 'rxjs';
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { beforeEachDispose } from '../before-each-dispose';
import { createStitchGateway } from '../../../src/modules/gateway';
import { ResourceGroup } from '../../../src/modules/resource-repository';

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
      remoteSchemas: [],
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
      remoteSchemas: [],
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
      remoteSchemas: [],
    },
  ],
];

describe.each(testCases)('Implicit Type Resolver Tests', (testName, resourceGroup) => {
  let client: ApolloServerTestClient;

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

  beforeEachDispose(() => {
    const stitch = createStitchGateway({
      resourceGroups: Rx.of(resourceGroup),
      fastifyInstance: { metrics: undefined as any },
    });
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
