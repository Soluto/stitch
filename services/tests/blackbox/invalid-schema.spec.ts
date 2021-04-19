import * as fs from 'fs/promises';
import { print } from 'graphql';
import { FastifyInstance } from 'fastify';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { createServer as createGateway } from '../../src/gateway';
import { ResourceGroup, Schema } from '../../src/modules/resource-repository';
import { sleep } from '../helpers/utility';

async function makeDefaultQuery(app: FastifyInstance) {
  const payload: GraphQLRequest = {
    query: print(gql`
      query {
        default
      }
    `),
  };

  const response = await app.inject({
    method: 'POST',
    url: '/graphql',
    payload,
  });
  return response;
}

describe('Invalid schema', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const resources: ResourceGroup = {
      schemas: [],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
    };

    await fs.writeFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));

    app = await createGateway();
  });

  afterAll(async () => {
    await app.close();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
  });

  test('Make default query', async () => {
    const response = await makeDefaultQuery(app);

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();
  });

  test('Save invalid schema', async () => {
    const schema: Schema = {
      metadata: {
        namespace: 'blackbox',
        name: 'invalid-schema',
      },
      schema: print(gql`
        type Query {
          foo: WrongType!
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

    const response = await app.inject({
      method: 'POST',
      url: '/updateSchema',
    });
    expect(response.statusCode).toEqual(500);
  });

  test('Make default query again', async () => {
    const response = await makeDefaultQuery(app);

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();
  });

  test('Wait for refresh and make default query', async () => {
    await sleep(500);
    const response = await makeDefaultQuery(app);

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();
  });

  test('Save valid schema', async () => {
    const schema: Schema = {
      metadata: {
        namespace: 'blackbox',
        name: 'invalid-schema',
      },
      schema: print(gql`
        type Query {
          foo: String! @localResolver(value: "FOO")
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

    const response = await app.inject({
      method: 'POST',
      url: '/updateSchema',
    });
    expect(response.statusCode).toEqual(200);
  });

  test('Query new field', async () => {
    const payload: GraphQLRequest = {
      query: print(gql`
        query {
          foo
        }
      `),
    };

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload,
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();
  });
});
