import * as fs from 'fs/promises';
import * as path from 'path';
import { FastifyInstance } from 'fastify';
import { createServer as createRegistry } from '../../src/registry';
import { ResourcesMetadata, ResourceMetadata, ResourceGroup, PolicyType } from '../../src/modules/resource-repository';
import { getCompiledFilename } from '../../src/modules/opa-helper';

jest.mock('../../src/modules/directives/policy/opa', () => ({
  ...(jest.requireActual('../../src/modules/directives/policy/opa') as Record<string, unknown>),
  getWasmPolicy: jest.fn(() => ({})),
}));

describe('Status endpoint', () => {
  let app: FastifyInstance;

  const registryResourceMetadataFile = process.env.FS_REGISTRY_RESOURCE_METADATA_PATH!;
  const gatewayResourceMetadataFile = process.env.FS_RESOURCE_METADATA_PATH!;

  const registryResourceFile = process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!;
  const gatewayResourceFile = process.env.FS_RESOURCE_REPOSITORY_PATH!;

  const policyAttachmentsFolderPath = process.env.FS_REPOSITORY_POLICY_ATTACHMENTS_FOLDER_PATH!;

  const registryMetadata: ResourcesMetadata = {
    checksum: 'e3947dcecqda3ce6a6b29718f41c09b1',
    summary: {
      schemas: 8,
      upstreams: 2,
      upstreamClientCredentials: 1,
      policyAttachments: 4,
      policies: 19,
      remoteSchemas: 11,
      basePolicy: 1,
      introspectionQueryPolicy: 1,
    },
  };

  const gatewayMetadata: ResourcesMetadata = {
    checksum: '505bb47e6ffq700792746223e51f49d1',
    summary: {
      schemas: 8,
      upstreams: 2,
      upstreamClientCredentials: 1,
      policyAttachments: 4,
      policies: 19,
      remoteSchemas: 11,
      basePolicy: 1,
      introspectionQueryPolicy: 1,
      pluginsData: 1,
    },
    plugins: [
      {
        name: 'an-awesome-plugin',
        version: '0.1.15',
      },
    ],
  };

  const p1Metadata: ResourceMetadata = { name: 'p1_name', namespace: 'p1_namespace' };
  const p2Metadata: ResourceMetadata = { name: 'p2_name', namespace: 'p2_namespace' };
  const resourceGroup: ResourceGroup = {
    schemas: [],
    upstreams: [],
    upstreamClientCredentials: [],
    policies: [
      { metadata: p1Metadata, type: PolicyType.opa, code: '' },
      { metadata: p2Metadata, type: PolicyType.opa, code: '' },
    ],
  };
  const p1AttachmentPath = path.join(policyAttachmentsFolderPath, getCompiledFilename(p1Metadata));
  const p2AttachmentPath = path.join(policyAttachmentsFolderPath, getCompiledFilename(p2Metadata));

  beforeAll(async () => {
    app = await createRegistry();

    await fs.mkdir(policyAttachmentsFolderPath, { recursive: true });

    await Promise.all([
      fs.writeFile(registryResourceMetadataFile, JSON.stringify(registryMetadata)),
      fs.writeFile(gatewayResourceMetadataFile, JSON.stringify(gatewayMetadata)),
      fs.writeFile(registryResourceFile, JSON.stringify(resourceGroup)),
      fs.writeFile(gatewayResourceFile, JSON.stringify(resourceGroup)),
      fs.writeFile(p1AttachmentPath, ''),
      fs.writeFile(p2AttachmentPath, ''),
    ]);
  });

  afterAll(async () => {
    await app.close();

    await Promise.all([
      fs.unlink(registryResourceMetadataFile),
      fs.unlink(gatewayResourceMetadataFile),
      fs.unlink(registryResourceFile),
      fs.unlink(gatewayResourceFile),
      fs.unlink(p1AttachmentPath).catch(() => {}),
      fs.unlink(p2AttachmentPath).catch(() => {}),
    ]);
  });

  it('Returns the gateway metadata info by default', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/status',
    });
    expect(response.statusCode).toEqual(200);
    expect(response.json()?.metadata).toEqual(gatewayMetadata);
  });

  it('Returns the registry metadata info when the registry query param is set to true', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/status',
      query: { registry: 'true' },
    });
    expect(response.statusCode).toEqual(200);
    expect(response.json()?.metadata).toEqual(registryMetadata);
  });

  it('Returns an empty missingOpaPolicyAttachments array when all the attachments exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/status',
    });
    expect(response.statusCode).toEqual(200);
    expect(response.json()?.missingOpaPolicyAttachments).toEqual([]);
  });

  it('Returns an empty missingOpaPolicyAttachments array when all the attachments exist but there is also an extra attachment without a policy', async () => {
    const extraAttachmentPath = path.join(policyAttachmentsFolderPath, 'extra-attachment.wasm');
    await fs.writeFile(extraAttachmentPath, '');

    const response = await app.inject({
      method: 'GET',
      url: '/status',
    });
    expect(response.statusCode).toEqual(200);
    expect(response.json()?.missingOpaPolicyAttachments).toEqual([]);

    await fs.unlink(extraAttachmentPath);
  });

  it('Returns the metadata of a policy that is missing an attachment in the missingOpaPolicyAttachments array', async () => {
    await fs.unlink(p1AttachmentPath);

    const response = await app.inject({
      method: 'GET',
      url: '/status',
    });
    expect(response.statusCode).toEqual(200);
    expect(response.json()?.missingOpaPolicyAttachments).toEqual([p1Metadata]);
  });
});
