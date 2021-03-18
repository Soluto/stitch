import * as fs from 'fs/promises';
import * as nock from 'nock';
import { FastifyInstance } from 'fastify';
import { graphqlSync, print } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { createServer as createRegistry } from '../../src/registry';
import GraphQLErrorSerializer from '../utils/graphql-error-serializer';
import { ResourceGroup, ResourceMetadata, Schema, Upstream } from '../../src/modules/resource-repository';

describe('Remote Schema with upstream', () => {
  const remoteServer = 'http://remote-server';

  let app: FastifyInstance;
  let dispose: () => Promise<void>;

  const xApiClient = 'remote-schemas';
  const metadata: ResourceMetadata = { namespace: 'remote-schemas', name: 'schema' };

  const schema: Schema = {
    metadata,
    schema: print(gql`
      type Query {
        foo: String! @gql(url: "${remoteServer}/graphql", fieldName: "foo")
      }
  `),
  };

  const upstream: Upstream = {
    metadata: {
      namespace: 'remote-schemas',
      name: 'upstream',
    },
    sourceHosts: [new URL(remoteServer).host],
    headers: [
      {
        name: 'x-api-client',
        value: '{ incomingRequest?.headers?.["x-api-client"]}',
      },
      {
        name: 'header-with-evaluation-error', // JWT is unavailable on Registry
        value: '{ JSON.stringify(jwt.payload) }',
      },
    ],
  };

  const refreshRemoteSchemaPayload: GraphQLRequest = {
    query: print(gql`
      mutation($url: String!) {
        refreshRemoteSchema(url: $url) {
          success
        }
      }
    `),
    variables: {
      url: `${remoteServer}/graphql`,
    },
  };

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

  const newRemoteSchema = makeExecutableSchema({
    typeDefs: gql`
      type Query {
        foo: Int
      }
    `,
    resolvers: {
      Query: {
        foo: () => 42,
      },
    },
  });

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const resources: ResourceGroup = {
      schemas: [],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
      remoteSchemas: [],
    };

    await fs.writeFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));
    await fs.writeFile(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));

    app = await createRegistry();
  });

  afterAll(async () => {
    await dispose();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
    await fs.unlink(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!);

    await fs.unlink(process.env.FS_RESOURCE_METADATA_PATH!);
    await fs.unlink(process.env.FS_REGISTRY_RESOURCE_METADATA_PATH!);
  });

  test('Add upstream', async () => {
    const payload: GraphQLRequest = {
      query: print(gql`
        mutation UpdateUpstream($input: [UpstreamInput!]!) {
          updateUpstreams(input: $input) {
            success
          }
        }
      `),
      variables: {
        input: [upstream],
      },
    };

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload,
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();
  });

  test('Add schema with @gql directive', async () => {
    const scope = nock(remoteServer)
      .post('/graphql')
      .matchHeader('x-api-client', xApiClient)
      .reply(200, (_, body: any) =>
        graphqlSync({
          schema: remoteSchema,
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        })
      );

    const payload: GraphQLRequest = {
      query: print(gql`
        mutation UpdateSchemas($input: [SchemaInput!]!) {
          updateSchemas(input: $input) {
            success
          }
        }
      `),
      variables: {
        input: [schema],
      },
    };

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload,
      headers: {
        'x-api-client': xApiClient,
      },
    });

    expect(scope.isDone()).toBeTruthy();
    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();

    const registryRGStr = await fs.readFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, { encoding: 'utf8' });
    const registryRG: ResourceGroup = JSON.parse(registryRGStr);
    expect(registryRG.remoteSchemas).toMatchSnapshot('registry resource group');

    const gatewayRGStr = await fs.readFile(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!, { encoding: 'utf8' });
    const gatewayRG: ResourceGroup = JSON.parse(gatewayRGStr);
    expect(gatewayRG.remoteSchemas).toMatchSnapshot('gateway resource group');
  });

  test('Refresh remote schema', async () => {
    const scope = nock(remoteServer)
      .post('/graphql')
      .matchHeader('x-api-client', xApiClient)
      .reply(200, (_, body: any) =>
        graphqlSync({
          schema: newRemoteSchema,
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        })
      );

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: refreshRemoteSchemaPayload,
      headers: {
        'x-api-client': xApiClient,
      },
    });

    expect(scope.isDone()).toBeTruthy();
    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();

    const registryRGStr = await fs.readFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, { encoding: 'utf8' });
    const registryRG: ResourceGroup = JSON.parse(registryRGStr);
    expect(registryRG.remoteSchemas).toMatchSnapshot('registry resource group');

    const gatewayRGStr = await fs.readFile(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!, { encoding: 'utf8' });
    const gatewayRG: ResourceGroup = JSON.parse(gatewayRGStr);
    expect(gatewayRG.remoteSchemas).toMatchSnapshot('gateway resource group');
  });
});
