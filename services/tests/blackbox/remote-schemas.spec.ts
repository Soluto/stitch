import * as fs from 'fs/promises';
import * as nock from 'nock';
import * as _ from 'lodash';
import { FastifyInstance } from 'fastify';
import { graphqlSync, print } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { createServer as createRegistry } from '../../src/registry';
import GraphQLErrorSerializer from '../utils/graphql-error-serializer';
import { ResourceGroup, ResourceMetadata, Schema } from '../../src/modules/resource-repository';

describe('Remote Schemas', () => {
  const remoteServer = 'http://remote-server';

  let app: FastifyInstance;

  const metadata: ResourceMetadata = { namespace: 'remote-schemas', name: 'schema' };

  const schema: Schema = {
    metadata,
    schema: print(gql`
      type Query {
        foo: String! @gql(url: "${remoteServer}/graphql", fieldName: "foo")
      }
  `),
  };

  const remoteSchemasPayload: GraphQLRequest = {
    query: print(gql`
      query {
        remoteSchemas {
          url
          schema
        }
      }
    `),
  };

  const remoteSchemaPayload: GraphQLRequest = {
    query: print(gql`
      query($url: String!) {
        remoteSchema(url: $url) {
          url
          schema
        }
      }
    `),
    variables: {
      url: `${remoteServer}/graphql`,
    },
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
    await app.close();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
    await fs.unlink(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!);

    await fs.unlink(process.env.FS_RESOURCE_METADATA_PATH!);
    await fs.unlink(process.env.FS_REGISTRY_RESOURCE_METADATA_PATH!);
  });

  test('Query empty resource group', async () => {
    const response1 = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: remoteSchemasPayload,
    });

    expect(response1.statusCode).toEqual(200);
    expect(response1.json().data).toMatchSnapshot('remote schemas');

    const response2 = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: remoteSchemaPayload,
    });

    expect(response2.statusCode).toEqual(200);
    expect(response2.json().data).toMatchSnapshot('remote schema');
  });

  test('Try to refresh remote schema when there is no remote schemas at all', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: refreshRemoteSchemaPayload,
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json()).toMatchSnapshot();
  });

  test('Add schema with @gql directive', async () => {
    const scope = nock(remoteServer)
      .post('/graphql')
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

  test('Query resource group', async () => {
    const response1 = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: remoteSchemasPayload,
    });

    expect(response1.statusCode).toEqual(200);
    expect(response1.json().data).toMatchSnapshot('remote schemas');

    const response2 = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: remoteSchemaPayload,
    });

    expect(response2.statusCode).toEqual(200);
    expect(response2.json().data).toMatchSnapshot('remote schema');
  });

  test('Try to refresh remote schema for non-exiting url', async () => {
    const refreshNonExistingRemoteSchemaPayload = _.cloneDeep(refreshRemoteSchemaPayload);
    _.merge(refreshNonExistingRemoteSchemaPayload, {
      variables: { url: 'http://does-not-exist' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: refreshNonExistingRemoteSchemaPayload,
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json()).toMatchSnapshot();
  });

  test('Refresh remote schema', async () => {
    const scope = nock(remoteServer)
      .post('/graphql')
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

  test('Query resource group again', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: remoteSchemaPayload,
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot('remote schema');
  });

  test('Delete the schema with @gql directive', async () => {
    const payload: GraphQLRequest = {
      query: print(gql`
        mutation DeleteSchemas($input: [ResourceMetadataInput!]!) {
          deleteSchemas(input: $input) {
            success
          }
        }
      `),
      variables: {
        input: [metadata],
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

  test('Query resource group after deletion', async () => {
    const response1 = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: remoteSchemasPayload,
    });

    expect(response1.statusCode).toEqual(200);
    expect(response1.json().data).toMatchSnapshot('remote schemas');

    const response2 = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: remoteSchemaPayload,
    });

    expect(response2.statusCode).toEqual(200);
    expect(response2.json().data).toMatchSnapshot('remote schema');
  });
});
