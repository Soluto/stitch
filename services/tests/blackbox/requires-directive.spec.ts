import * as fs from 'fs/promises';
import * as nock from 'nock';
import { HTTPInjectOptions } from 'fastify';
import { graphqlSync, print } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { createServer as createRegistry } from '../../src/registry';
import { createServer as createGateway } from '../../src/gateway';
import GraphQLErrorSerializer from '../utils/graphql-error-serializer';
import { ResourceGroup, Schema } from '../../src/modules/resource-repository';
import { updateSchemasMutation } from '../helpers/registry-request-builder';

describe('@requires directive', () => {
  const remoteServerFoo = 'http://remote-server-foo';
  const remoteServerBar = 'http://remote-server-bar';

  const schemaFoo: Schema = {
    metadata: { namespace: 'requires-directive', name: 'schema-foo' },
    schema: print(gql`
      type Query {
        baz: Baz! @localResolver(value: { taz: "TAZ" })
      }

      type Baz @key(fields: "foo") {
        taz: String!
        foo: String! @gql(url: "${remoteServerFoo}/graphql", fieldName: "foo")
      }
  `),
  };

  const schemaBar: Schema = {
    metadata: { namespace: 'requires-directive', name: 'schema-bar' },
    schema: print(gql`
      extend type Baz @key(fields: "foo") {
        foo: String! @external
        taz: String! @external
        bar: String!
          @requires(fields: "foo taz")
          @gql(url: "${remoteServerBar}/graphql", fieldName: "bar", arguments: { foo: "{source.foo ?? source.taz}" })
      }
  `),
  };

  const registryInject = (schema: Schema): HTTPInjectOptions => ({
    method: 'POST',
    url: '/graphql',
    payload: {
      query: updateSchemasMutation,
      variables: {
        schema,
      },
    },
  });

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const remoteSchemaFoo = makeExecutableSchema({
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

    const remoteSchemaBar = makeExecutableSchema({
      typeDefs: gql`
        type Query {
          bar(foo: String): String
        }
      `,
      resolvers: {
        Query: {
          bar: (_, args: { foo: string }) => `BAR ${args.foo} BAR`,
        },
      },
    });

    nock(remoteServerFoo)
      .persist()
      .post('/graphql')
      .reply(200, (_, body: any) =>
        graphqlSync({
          schema: remoteSchemaFoo,
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        })
      );

    nock(remoteServerBar)
      .persist()
      .post('/graphql')
      .reply(200, (_, body: any) =>
        graphqlSync({
          schema: remoteSchemaBar,
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        })
      );

    const resources: ResourceGroup = {
      schemas: [],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
      remoteSchemas: [],
    };

    await fs.writeFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));
    await fs.writeFile(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));
  });

  afterAll(async () => {
    nock.cleanAll();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
    await fs.unlink(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!);
  });

  test('Add schemas with @gql directive', async () => {
    const registryApp = await createRegistry();

    const responseFoo = await registryApp.inject(registryInject(schemaFoo));
    expect(responseFoo.statusCode).toEqual(200);
    expect(responseFoo.json().data.result.success).toBeTruthy();

    const responseBar = await registryApp.inject(registryInject(schemaBar));
    expect(responseBar.statusCode).toEqual(200);
    expect(responseBar.json().data.result.success).toBeTruthy();

    await registryApp.close();

    // For some reason without this line prom-client throws error on gateway creation.
    // Likely it stores metrics in global variable.
    registryApp.metrics.client.register.clear();
  });

  test('Make query', async () => {
    await fs.stat(process.env.FS_RESOURCE_REPOSITORY_PATH!);
    await fs.stat(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!);

    const payload: GraphQLRequest = {
      query: print(gql`
        query {
          baz {
            bar
          }
        }
      `),
    };

    const { app: gatewayApp, dispose } = await createGateway();

    const response = await gatewayApp.inject({
      method: 'POST',
      url: '/graphql',
      payload,
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();

    await dispose();
  });
});
