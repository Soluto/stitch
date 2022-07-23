import { graphqlSync, print } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'apollo-server-core';
import * as nock from 'nock';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { app } from '../../../src/registry';
import { ResourceGroup, Schema, Upstream } from '../../../src/modules/resource-repository';
import { mockResourceBucket } from '../resource-bucket';

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

describe.each(testCases)('Upstreams - Gql - Introspection', (testCaseName, { upstreams, virtualHost }) => {
  const remoteServer = virtualHost ?? defaultRemoteServer;

  beforeAll(() => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
    mockResourceBucket();
  });

  beforeEach(async () => {
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
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it(testCaseName, async () => {
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

    const resourceGroup: ResourceGroup = {
      schemas: [schema],
      upstreams,
      upstreamClientCredentials: [],
      policies: [],
    };

    const response = await app.executeOperation({
      query: gql`
        query ValidateResourceGroup($input: ResourceGroupInput!) {
          validateResourceGroup(input: $input) {
            success
          }
        }
      `,
      variables: {
        input: resourceGroup,
      },
    });
    const { data, errors } = response;
    expect({ data, errors }).toMatchSnapshot();
  });
});
