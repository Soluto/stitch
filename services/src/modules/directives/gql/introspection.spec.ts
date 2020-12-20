import { gql } from 'apollo-server-core';
import { DocumentNode, graphqlSync, print } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import * as nock from 'nock';
import { ResourceGroup } from '../../resource-repository';
import { ActiveDirectoryAuth } from '../../upstreams/authentication';
import { updateRemoteGqlSchemas } from './introspection';

interface RemoteServer {
  schema?: DocumentNode;
  responseStatusCode?: number;
  shouldBeSkipped?: boolean;
}

interface TestCase {
  resourceGroupPart?: Partial<ResourceGroup>;
  remoteServers: Record<string, RemoteServer>;
}

const testCases: [string, TestCase][] = [
  [
    '1. No remote graphql servers',
    {
      resourceGroupPart: {
        schemas: [
          {
            metadata: { namespace: 'ns', name: 'schema-1' },
            schema: print(gql`
              type Query {
                foo: String!
              }
            `),
          },
        ],
      },
      remoteServers: {},
    },
  ],
  [
    '2. New unknown remote graphql server',
    {
      resourceGroupPart: {
        schemas: [
          {
            metadata: { namespace: 'ns', name: 'schema-2' },
            schema: print(gql`
              type Query {
                foo: String! @gql(url: "http://remote-gql-test-2/graphql", fieldName: "foo")
              }
            `),
          },
        ],
      },
      remoteServers: {
        ['http://remote-gql-test-2/graphql']: {
          schema: gql`
            type Query {
              foo: String
            }
          `,
        },
      },
    },
  ],
  [
    '3. Known remote graphql server',
    {
      resourceGroupPart: {
        schemas: [
          {
            metadata: { namespace: 'ns', name: 'schema-3' },
            schema: print(gql`
              type Query {
                foo: String! @gql(url: "http://remote-gql-test-3/graphql", fieldName: "foo")
              }
            `),
          },
        ],
        remoteSchemas: [
          {
            schema: print(gql`
              type Query {
                foo: String
              }
            `),
            url: 'http://remote-gql-test-3/graphql',
          },
        ],
      },
      remoteServers: {
        ['http://remote-gql-test-3/graphql']: {
          shouldBeSkipped: true,
        },
      },
    },
  ],
  [
    '4. One known and one unknown graphql servers',
    {
      resourceGroupPart: {
        schemas: [
          {
            metadata: { namespace: 'ns', name: 'schema-4' },
            schema: print(gql`
              type Query {
                foo: String! @gql(url: "http://remote-gql-test-4-1/graphql", fieldName: "foo")
                bar: String! @gql(url: "http://remote-gql-test-4-2/graphql", fieldName: "bar")
              }
            `),
          },
        ],
        remoteSchemas: [
          {
            schema: print(gql`
              type Query {
                bar: String
              }
            `),
            url: 'http://remote-gql-test-4-1/graphql',
          },
        ],
      },
      remoteServers: {
        ['http://remote-gql-test-4-1/graphql']: {
          shouldBeSkipped: true,
        },
        ['http://remote-gql-test-4-2/graphql']: {
          schema: gql`
            type Query {
              bar: String
            }
          `,
        },
      },
    },
  ],
  [
    '5. Error from remote graphql server',
    {
      resourceGroupPart: {
        schemas: [
          {
            metadata: { namespace: 'ns', name: 'schema-5' },
            schema: print(gql`
              type Query {
                foo: String! @gql(url: "http://remote-gql-test-5/graphql", fieldName: "foo")
              }
            `),
          },
        ],
      },
      remoteServers: {
        ['http://remote-gql-test-5/graphql']: {
          responseStatusCode: 500,
        },
      },
    },
  ],
];

const mockResponse = (host: string, remoteSchema?: DocumentNode, responseCode = 200) =>
  nock(host)
    .persist()
    .post('/graphql')
    .reply(responseCode, (_url, body: Record<string, any>) =>
      responseCode === 200
        ? (remoteSchema &&
            graphqlSync({
              schema: makeExecutableSchema({ typeDefs: remoteSchema! }),
              source: body.query,
              variableValues: body.variables,
              operationName: body.operationName,
            })) ||
          'Should not reach this'
        : 'Error'
    );

describe('Introspection', () => {
  const defaultResourceGroup: ResourceGroup = {
    schemas: [],
    policies: [],
    upstreams: [],
    upstreamClientCredentials: [],
  };

  afterEach(() => {
    nock.cleanAll();
  });

  test.each(testCases)('%s', async (_, { resourceGroupPart, remoteServers }) => {
    const httpCallMocks: [nock.Scope, boolean][] = Object.entries(
      remoteServers
    ).map(([url, { schema, responseStatusCode, shouldBeSkipped }]: [string, RemoteServer]) => [
      mockResponse(new URL(url).origin, schema, responseStatusCode),
      !shouldBeSkipped,
    ]);

    const resourceGroup = {
      ...defaultResourceGroup,
      ...resourceGroupPart,
    };

    try {
      await updateRemoteGqlSchemas(resourceGroup, new ActiveDirectoryAuth());

      httpCallMocks.forEach(httpCallMock => expect(httpCallMock[0].isDone()).toBe(httpCallMock[1]));

      expect(resourceGroup).toMatchSnapshot();
    } catch (err) {
      expect(err).toMatchSnapshot();
    }
  });
});
