import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import * as Rx from 'rxjs';
import * as nock from 'nock';
import { createStitchGateway } from '../../../../src/modules/gateway';
import { DefaultUpstream, ResourceGroup, Schema, Upstream } from '../../../../src/modules/resource-repository';
import { beforeEachDispose } from '../../before-each-dispose';

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
              value: '{request?.headers?.["x-api-client"] ?? "Stitch Default"}',
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
  let client: ApolloServerTestClient;
  const remoteServer = virtualHost ?? defaultRemoteServer;

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

    const stitch = createStitchGateway({
      resourceGroups: Rx.of(resourceGroup),
      fastifyInstance: { metrics: undefined as any },
    });
    client = createTestClient(stitch.server);

    return () => {
      nock.cleanAll();
      return stitch.dispose();
    };
  });

  it(testCaseName, async () => {
    const response = await client
      .query({
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
