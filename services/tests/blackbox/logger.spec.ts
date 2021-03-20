import * as fs from 'fs/promises';
import * as nock from 'nock';
import { print } from 'graphql';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { FastifyInstance } from 'fastify';
import logger from '../../src/modules/logger';
import { createServer as createGateway } from '../../src/gateway';
import { ResourceGroup, Schema } from '../../src/modules/resource-repository';
import { startCaptureOutput } from '../helpers/get-container-logs';

describe('Logger config', () => {
  const remoteServer = 'http://remote-server';
  const fooId = '1';
  const originalLogLevel = logger.level;

  let app: FastifyInstance;
  let dispose: () => Promise<void>;

  let remoteServerScope: nock.Scope;

  beforeAll(async () => {
    logger.level = 'trace';
    remoteServerScope = nock(remoteServer).get(`/foo/${fooId}`).replyWithError('Something went wrong');

    const schema: Schema = {
      metadata: {
        namespace: 'blackbox',
        name: 'default-default-upstreams',
      },
      schema: print(gql`
        type Query {
          foo(id: ID!): Foo! @rest(url: "${remoteServer}/foo/{args.id}", headers: [{key: "authorization", value: "Basic UsErPaSsWoRd"}])
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
    logger.level = originalLogLevel;
    await dispose();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
  });

  test('should pass authorization header from incoming request to outgoing one', async () => {
    const endCaptureOutput = startCaptureOutput();

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
    });

    const captureResult = await endCaptureOutput();
    expect(captureResult).toContain('"extensions": "[Redacted]"');

    expect(response.statusCode).toEqual(200);

    expect(remoteServerScope.isDone()).toBeTruthy();
  });
});
