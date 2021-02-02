import * as fs from 'fs/promises';
import * as nock from 'nock';
import { print } from 'graphql';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { FastifyInstance } from 'fastify';
import { createServer as createGateway } from '../../../src/gateway';
import { ResourceGroup, Schema } from '../../../src/modules/resource-repository';
import { getInvalidToken } from '../../helpers/get-token';

describe('Default default upstream', () => {
  const remoteServer = 'http://remote-server';
  const fooId = '1';

  let app: FastifyInstance;
  let dispose: () => Promise<void>;

  let remoteServerScope: nock.Scope;

  let token: string;

  beforeAll(async () => {
    token = await getInvalidToken();

    remoteServerScope = nock(remoteServer)
      .get(`/foo/${fooId}`)
      .matchHeader('Authorization', `Bearer ${token}`)
      .reply(200, { id: fooId, baz: 'BAZ', bar: 'BAR' });

    const schema: Schema = {
      metadata: {
        namespace: 'blackbox',
        name: 'default-default-upstreams',
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

    const resources: ResourceGroup = {
      schemas: [schema],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
    };

    await fs.writeFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));

    ({ app, dispose } = await createGateway());
  });

  afterAll(async () => {
    await dispose();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
    nock.cleanAll();
  });

  test('should pass authorization header from incoming request to outgoing one', async () => {
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
      },
    });

    expect(response.statusCode).toEqual(200);

    expect(remoteServerScope.isDone()).toBeTruthy();
  });
});
