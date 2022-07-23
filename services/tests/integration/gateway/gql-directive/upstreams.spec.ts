import { graphqlSync, print, printSchema } from 'graphql';
import { ApolloServerBase, gql } from 'apollo-server-core';
import * as nock from 'nock';
import { makeExecutableSchema } from '@graphql-tools/schema';
import createStitchGateway from '../../../../src/modules/apollo-server';
import { ResourceGroup, Schema, Upstream } from '../../../../src/modules/resource-repository';
import { beforeEachDispose } from '../../before-each-dispose';
import { RemoteSchema } from '../../../../src/modules/directives/gql';

jest.mock('../../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../../src/modules/resource-repository/get-resource-repository';

interface TestCase {
  upstreams: Upstream[];
  virtualHost?: string;
  mockAuth?: boolean;
}

const host = 'http://virtual-host';
const defaultRemoteServer = 'http://remote-server';

const testCases: [string, TestCase][] = [
  ['No upstreams', { upstreams: [] }],
  [
    'Upstream with host without targetOrigin',
    {
      upstreams: [
        {
          metadata: { namespace: 'upstreams', name: 'upsteam-1' },
          host: new URL(defaultRemoteServer).host,
        },
      ],
    },
  ],
  [
    'Upstream with host and targetOrigin',
    {
      upstreams: [
        {
          metadata: { namespace: 'upstreams', name: 'upsteam-2' },
          host: new URL(host).host,
          targetOrigin: defaultRemoteServer,
        },
      ],
      virtualHost: 'http://virtual-host',
    },
  ],
];

describe.each(testCases)('Gql - Upstreams', (testCaseName, { upstreams, virtualHost }) => {
  const remoteServer = virtualHost ?? defaultRemoteServer;
  let server: ApolloServerBase;

  beforeEachDispose(async () => {
    const remoteSchema = makeExecutableSchema({
      typeDefs: gql`
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'FOO',
        },
      },
    });

    nock(defaultRemoteServer)
      .post('/graphql')
      .reply(200, (_, body: any) =>
        graphqlSync({
          schema: remoteSchema,
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        })
      );

    const schema: Schema = {
      metadata: {
        namespace: 'upstreams',
        name: 'simple',
      },
      schema: print(gql`
        type Query {
          foo: String @gql(url: "${remoteServer}/graphql", fieldName: "foo")
        }
      `),
    };

    const remoteSchemaResource: RemoteSchema = {
      url: `${remoteServer}/graphql`,
      schema: printSchema(remoteSchema),
    };

    const resourceGroup: ResourceGroup = {
      schemas: [schema],
      upstreams,
      upstreamClientCredentials: [],
      policies: [],
      remoteSchemas: [remoteSchemaResource],
    };

    (getResourceRepository as jest.Mock).mockImplementationOnce(
      jest.fn().mockReturnValueOnce({
        fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
      })
    );

    ({ server } = await createStitchGateway());
    return () => {
      nock.cleanAll();
      return server.stop();
    };
  });

  it(testCaseName, async () => {
    const response = await server
      .executeOperation({
        query: gql`
          query {
            foo
          }
        `,
      })
      .catch(e => e.response);

    expect(response).toMatchSnapshot();
  });
});
