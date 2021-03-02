import * as fs from 'fs/promises';
import { print } from 'graphql';
import { FastifyInstance } from 'fastify';
import { gql } from 'apollo-server-core';
import { createServer as createRegistry } from '../../src/registry';
import { updateSchemasMutation } from '../helpers/registry-request-builder';
import { ResourceGroup, Schema } from '../../src/modules/resource-repository';
import { PluginMetadata } from '../../src/modules/plugins/types';

const plugins: PluginMetadata[] = [
  {
    name: 'First',
    version: '0.1.0',
  },
  {
    name: 'Second',
    version: '1.2.3',
  },
];
jest.mock('../../src/modules/plugins', () => ({
  ...(jest.requireActual('../../src/modules/plugins') as Record<string, unknown>),
  getPlugins: jest.fn(() => plugins),
}));

describe('Resource metadata', () => {
  let app: FastifyInstance;

  const schema1: Schema = {
    metadata: {
      namespace: 'blackbox-tests',
      name: 'resource-metadata-1',
    },
    schema: print(gql`
      type Query {
        foo: String
      }
    `),
  };

  const schema2: Schema = {
    metadata: {
      namespace: 'blackbox-tests',
      name: 'resource-metadata-2',
    },
    schema: print(gql`
      type Query {
        bar: String
      }
    `),
  };

  const registryResourceFile = process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!;
  const registryResourceMetadataFile = process.env.FS_REGISTRY_RESOURCE_METADATA_PATH!;

  const gatewayResourceFile = process.env.FS_RESOURCE_REPOSITORY_PATH!;
  const gatewayResourceMetadataFile = process.env.FS_RESOURCE_METADATA_PATH!;

  beforeAll(async () => {
    app = await createRegistry();

    const resources: ResourceGroup = {
      schemas: [],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
      remoteSchemas: [],
    };
    await fs.writeFile(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));
  });

  afterAll(async () => {
    await app.close();
    await fs.unlink(gatewayResourceFile);
    await fs.unlink(registryResourceFile);
    await fs.unlink(registryResourceMetadataFile);
    await fs.unlink(gatewayResourceMetadataFile);
  });

  test('First update', async () => {
    const responseFoo = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: updateSchemasMutation,
        variables: {
          schema: schema1,
        },
      },
    });
    expect(responseFoo.statusCode).toEqual(200);
    expect(responseFoo.json().data.result.success).toBeTruthy();
  });

  test('Check metadata files', async () => {
    const registryResourceMetadata = await fs.readFile(registryResourceMetadataFile, { encoding: 'utf8' });
    expect(registryResourceMetadata).toMatchSnapshot();

    const gatewayResourceMetadata = await fs.readFile(gatewayResourceMetadataFile, { encoding: 'utf8' });
    expect(gatewayResourceMetadata).toMatchSnapshot();
  });

  test('Second update', async () => {
    const responseFoo = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: updateSchemasMutation,
        variables: {
          schema: schema2,
        },
      },
    });
    expect(responseFoo.statusCode).toEqual(200);
    expect(responseFoo.json().data.result.success).toBeTruthy();
  });

  test('Check metadata files again', async () => {
    const registryResourceMetadata = await fs.readFile(registryResourceMetadataFile, { encoding: 'utf8' });
    expect(registryResourceMetadata).toMatchSnapshot();

    const gatewayResourceMetadata = await fs.readFile(gatewayResourceMetadataFile, { encoding: 'utf8' });
    expect(gatewayResourceMetadata).toMatchSnapshot();
  });
});
