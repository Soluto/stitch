import { print } from 'graphql';
import { ApolloServerBase, gql } from 'apollo-server-core';
import * as nock from 'nock';
import createStitchGateway from '../../../../src/modules/apollo-server';
import { DefaultUpstream, ResourceGroup, Schema, Upstream } from '../../../../src/modules/resource-repository';
import { beforeEachDispose } from '../../before-each-dispose';

jest.mock('../../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../../src/modules/resource-repository/get-resource-repository';

interface TestCase {
  upstreams: Upstream[];
  defaultUpstream?: DefaultUpstream;
  virtualHost?: string;
  headers?: Record<string, string>;
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
  [
    'Upstream with headers',
    {
      upstreams: [
        {
          metadata: { namespace: 'upstreams', name: 'upsteam-3' },
          host: new URL(defaultRemoteServer).host,
          headers: [
            {
              name: 'x-api-client',
              value: 'Stitch',
            },
          ],
        },
      ],
      headers: { ['x-api-client']: 'Stitch' },
    },
  ],
  [
    'Upstream with headers from request',
    {
      upstreams: [
        {
          metadata: { namespace: 'upstreams', name: 'upsteam-3' },
          host: new URL(defaultRemoteServer).host,
          headers: [
            {
              name: 'x-api-client',
              value: '{incomingRequest?.headers?.["x-api-client"] ?? "Stitch Default"}',
            },
          ],
        },
      ],
      headers: { ['x-api-client']: 'Stitch Default' },
    },
  ],
  [
    'Default upstream',
    {
      upstreams: [],
      defaultUpstream: {
        headers: [
          {
            name: 'x-api-client',
            value: 'Stitch',
          },
        ],
      },
      headers: { ['x-api-client']: 'Stitch' },
    },
  ],
];

describe.each(testCases)('Rest - Upstreams', (testCaseName, { upstreams, defaultUpstream, virtualHost, headers }) => {
  const remoteServer = virtualHost ?? defaultRemoteServer;
  let server: ApolloServerBase;
  beforeEachDispose(async () => {
    let postMock = nock(defaultRemoteServer).post('/api/mock', b => !!b.name);

    if (headers) {
      postMock = Object.entries(headers).reduce(
        (pm, [headerName, headerValue]) => pm.matchHeader(headerName, headerValue),
        postMock
      );
    }

    postMock.reply(200, (_, b: any) => ({ id: '1', name: b.name }));

    const schema: Schema = {
      metadata: {
        namespace: 'upstreams',
        name: 'simple',
      },
      schema: print(gql`
        type Foo {
          id: ID!
          name: String!
        }

        type Mutation {
          createFoo(name: String!): Foo! @rest(url: "${remoteServer}/api/mock", method: "POST", body: "{{ name: args.name }}")
        }
      `),
    };

    const resourceGroup: ResourceGroup = {
      schemas: [schema],
      upstreams,
      upstreamClientCredentials: [],
      policies: [],
    };

    if (defaultUpstream) resourceGroup.defaultUpstream = defaultUpstream;

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
          mutation {
            createFoo(name: "BAR") {
              id
              name
            }
          }
        `,
      })
      .catch(e => e.response);

    expect(response).toMatchSnapshot();
  });
});
