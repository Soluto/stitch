import { gql } from 'apollo-server-core';
import { concatAST, DocumentNode, graphqlSync, print } from 'graphql';
import { IResolvers, makeExecutableSchema } from 'graphql-tools';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import * as nock from 'nock';
import { ResourceGroup } from '../../resource-repository';
import { ActiveDirectoryAuth } from '../../upstreams/authentication';
import { sdl as gqlDirectiveSdl, GqlDirective } from './directive';
import { updateRemoteGqlSchemas } from './introspection';

interface RemoteServer {
  schema?: DocumentNode;
  responseStatusCode?: number;
  shouldBeSkipped?: boolean;
}

interface TestCase {
  resourceGroup: Partial<ResourceGroup>;
  localSchema: DocumentNode;
  remoteServers: Record<string, RemoteServer>;
}

const testCases: [string, TestCase][] = [
  [
    '1. No remote graphql servers',
    {
      resourceGroup: {},
      localSchema: gql`
        type Query {
          foo: String!
        }
      `,
      remoteServers: {},
    },
  ],
  [
    '2. New unknown remote graphql server',
    {
      resourceGroup: {},
      localSchema: gql`
        type Query {
          foo: String! @gql(url: "http://remote-gql-test-2/graphql", fieldName: "foo")
        }
      `,
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
      resourceGroup: {
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
      localSchema: gql`
        type Query {
          foo: String! @gql(url: "http://remote-gql-test-3/graphql", fieldName: "foo")
        }
      `,
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
      resourceGroup: {
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
      localSchema: gql`
        type Query {
          foo: String! @gql(url: "http://remote-gql-test-4-1/graphql", fieldName: "foo")
          bar: String! @gql(url: "http://remote-gql-test-4-2/graphql", fieldName: "bar")
        }
      `,
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
      resourceGroup: {},
      localSchema: gql`
        type Query {
          foo: String! @gql(url: "http://remote-gql-test-5/graphql", fieldName: "foo")
        }
      `,
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
        ? graphqlSync({
            schema: makeExecutableSchema({ typeDefs: remoteSchema! }),
            source: body.query,
            variableValues: body.variables,
            operationName: body.operationName,
          })
        : 'Error'
    );

describe('Introspection', () => {
  const scalarsSdl = gql`
    scalar JSON
    scalar JSONObject
  `;

  const scalarsResolvers: IResolvers = {
    JSON: GraphQLJSON,
    JSONObject: GraphQLJSONObject,
  };

  const defaultResourceGroup: ResourceGroup = {
    schemas: [],
    policies: [],
    upstreams: [],
    upstreamClientCredentials: [],
    remoteSchemas: [],
  };

  afterEach(() => {
    nock.cleanAll();
  });

  test.each(testCases)('%s', async (_, { resourceGroup, localSchema, remoteServers }) => {
    const httpCallMocks: [nock.Scope, boolean][] = Object.entries(
      remoteServers
    ).map(([url, { schema, responseStatusCode, shouldBeSkipped }]: [string, RemoteServer]) => [
      mockResponse(new URL(url).origin, schema, responseStatusCode),
      !shouldBeSkipped,
    ]);

    const schema = makeExecutableSchema({
      typeDefs: concatAST([localSchema, gqlDirectiveSdl, scalarsSdl]),
      resolvers: scalarsResolvers,
      schemaDirectives: {
        gql: GqlDirective,
      },
    });

    try {
      await updateRemoteGqlSchemas(schema, { ...defaultResourceGroup, ...resourceGroup }, new ActiveDirectoryAuth());

      httpCallMocks.forEach(httpCallMock => expect(httpCallMock[0].isDone()).toBe(httpCallMock[1]));

      expect(resourceGroup).toMatchSnapshot();
    } catch (err) {
      expect(err).toMatchSnapshot();
    }
  });
});
