import * as fs from 'fs/promises';
import * as nock from 'nock';
import { HTTPInjectOptions } from 'fastify';
import { print } from 'graphql';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { createServer as createRegistry } from '../../src/registry';
import { createServer as createGateway } from '../../src/gateway';
import GraphQLErrorSerializer from '../utils/graphql-error-serializer';
import { ResourceGroup, Schema } from '../../src/modules/resource-repository';
import { updateSchemasMutation } from '../helpers/registry-request-builder';

describe('@enumResolver directive', () => {
  const schemaFoo: Schema = {
    metadata: { namespace: 'requires-directive', name: 'schema-foo' },
    schema: print(gql`
      enum Foo @enumResolver {
        Bar @enumValue(value: "bar")
        Baz @enumValue(value: "baz")
        Taz @enumValue(value: "taz")
      }

      type Query {
        bar: Foo @localResolver(value: "bar")
        baz(f: Foo): Boolean @localResolver(value: "{args.f === 'baz'}")
        taz(f: Foo): Boolean @localResolver(value: "{args.f === 'taz'}")
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

    const resources: ResourceGroup = {
      schemas: [],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
    };

    await fs.writeFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));
    await fs.writeFile(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));
  });

  afterAll(async () => {
    nock.cleanAll();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
    await fs.unlink(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!);

    await fs.unlink(process.env.FS_RESOURCE_METADATA_PATH!);
    await fs.unlink(process.env.FS_REGISTRY_RESOURCE_METADATA_PATH!);
  });

  test('Add schemas with @enumResolver directive', async () => {
    const registryApp = await createRegistry();

    const responseFoo = await registryApp.inject(registryInject(schemaFoo));
    expect(responseFoo.statusCode).toEqual(200);
    expect(responseFoo.json().data.result.success).toBeTruthy();

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
        query($taz: Foo) {
          bar
          baz(f: Baz)
          taz(f: $taz)
        }
      `),
      variables: {
        taz: 'Taz',
      },
    };

    const gatewayApp = await createGateway();

    const response = await gatewayApp.inject({
      method: 'POST',
      url: '/graphql',
      payload,
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();

    await gatewayApp.close();
  });
});
