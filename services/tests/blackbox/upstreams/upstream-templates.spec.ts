import * as fs from 'fs/promises';
import * as nock from 'nock';
import { print } from 'graphql';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { FastifyInstance } from 'fastify';
import { createServer as createGateway } from '../../../src/gateway';
import { ResourceGroup, Schema, Upstream } from '../../../src/modules/resource-repository';
import { getInvalidToken } from '../../helpers/get-token';

describe('Upstream templates', () => {
  const remoteServer = 'http://remote-server';
  const xApiClient = 'frontend-app';
  const jwtIssuer = 'https://oidc-provider';
  const fooId = '1';

  let app: FastifyInstance;
  let dispose: () => Promise<void>;

  let remoteServerScope: nock.Scope;

  let token: string;

  beforeAll(async () => {
    token = await getInvalidToken({ issuer: jwtIssuer });

    remoteServerScope = nock(remoteServer)
      .get(`/foo/${fooId}`)
      .matchHeader('x-jwt-issuer', jwtIssuer)
      .matchHeader('x-api-client', xApiClient)
      .reply(200, { id: fooId, baz: 'BAZ', bar: 'BAR' });

    const schema: Schema = {
      metadata: {
        namespace: 'blackbox',
        name: 'upstreams-headers',
      },
      schema: print(gql`
        type Query {
          foo(id: ID!): Foo! @rest(url: "${remoteServer}/foo/{args.id}")
        }

        type Foo {
          id: ID!
          baz: String!
          bar: String!
        }
      `),
    };

    const upstreams: Upstream[] = [
      {
        metadata: {
          namespace: 'blackbox',
          name: 'upstream-template-1',
        },
        fromTemplate: {
          namespace: 'blackbox',
          name: 'upstream-template-2',
        },
        sourceHosts: [new URL(remoteServer).host],
      },
      {
        metadata: {
          namespace: 'blackbox',
          name: 'upstream-template-2',
        },
        fromTemplate: {
          namespace: 'blackbox',
          name: 'upstream-template-3',
        },
        isTemplate: true,
        headers: [
          {
            name: 'x-api-client',
            value: '{incomingRequest?.headers?.["x-api-client"]}',
          },
          {
            name: 'x-jwt-issuer',
            value: '{jwt?.payload?.iss}',
          },
        ],
      },
      {
        metadata: {
          namespace: 'blackbox',
          name: 'upstream-template-3',
        },
        isTemplate: true,
        headers: [
          {
            name: 'x-jwt-issuer',
            value: '{jwt?.payload?.iss}',
          },
        ],
      },
    ];

    const resources: ResourceGroup = {
      schemas: [schema],
      upstreams,
      upstreamClientCredentials: [],
      policies: [],
    };

    await fs.writeFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));

    ({ app, dispose } = await createGateway());
  });

  afterAll(async () => {
    await dispose();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
  });

  test('should apply upstream with its template', async () => {
    const payload: GraphQLRequest = {
      query: print(gql`
        query {
          foo(id: "${fooId}") {
            id
            baz
            bar
          }
        }
      `),
    };

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload,
      headers: {
        authorization: `Bearer ${token}`,
        ['x-api-client']: xApiClient,
      },
    });

    expect(response.statusCode).toEqual(200);

    expect(remoteServerScope.isDone()).toBeTruthy();
  });
});
