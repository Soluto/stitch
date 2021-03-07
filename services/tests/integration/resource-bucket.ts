import * as nock from 'nock';
import * as xml2js from 'xml2js';
import { ResourceGroup, ResourcesMetadata } from '../../src/modules/resource-repository';

export interface MockResourceBucket {
  registry: ResourceGroup;
  gateway: ResourceGroup;
  registryMetadata: ResourcesMetadata;
  gatewayMetadata: ResourcesMetadata;
  policyFiles: MockPolicyFiles;
}

const emptyResourcesMetadata: ResourcesMetadata = {
  checksum: 'ABC',
  summary: {},
  plugins: [],
};

const emptyResourceGroup: ResourceGroup = {
  schemas: [],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [],
};

export function mockResourceBucket(initValue: Partial<MockResourceBucket> = {}) {
  const s3endpoint = process.env.S3_ENDPOINT;
  const bucketName = process.env.S3_RESOURCE_BUCKET_NAME;
  const objectKey = process.env.S3_RESOURCE_OBJECT_KEY;
  const registryObjectKey = process.env.S3_REGISTRY_RESOURCE_OBJECT_KEY;
  const metadataObjectKey = process.env.S3_RESOURCE_METADATA_OBJECT_KEY;
  const registryMetadataObjectKey = process.env.S3_REGISTRY_RESOURCE_METADATA_OBJECT_KEY;

  const policiesKeyPrefix = process.env.S3_POLICY_ATTACHMENTS_KEY_PREFIX;
  const policiesPrefixQueryParamRegex = `prefix=${encodeURIComponent(policiesKeyPrefix!)}.*`;
  const queryParamsSeparatorRegex = '?.*';
  const value: MockResourceBucket = {
    registry: initValue.registry ?? emptyResourceGroup,
    registryMetadata: initValue.registryMetadata ?? emptyResourcesMetadata,
    gateway: initValue.gateway ?? initValue.registry ?? emptyResourceGroup,
    gatewayMetadata: initValue.gatewayMetadata ?? initValue.registryMetadata ?? emptyResourcesMetadata,
    policyFiles: initValue.policyFiles ?? {},
  };

  nock(s3endpoint!)
    .persist()
    // objectKey
    .get(`/${bucketName!}/${objectKey}`)
    .reply(200, value.gateway)
    .put(`/${bucketName!}/${objectKey}`)
    .reply(200, (_, body) => {
      value.gateway = JSON.parse(body as string) as ResourceGroup;
    })
    // metadataObjectKey
    .get(`/${bucketName!}/${metadataObjectKey}`)
    .reply(200, value.gatewayMetadata)
    .put(`/${bucketName!}/${metadataObjectKey}`)
    .reply(200, (_, body) => {
      value.gatewayMetadata = JSON.parse(body as string) as ResourcesMetadata;
    })
    // registryObjectKey
    .get(`/${bucketName!}/${registryObjectKey}`)
    .reply(200, value.registry)
    .put(`/${bucketName!}/${registryObjectKey}`)
    .reply(200, (_, body) => {
      value.registry = JSON.parse(body as string) as ResourceGroup;
    })
    // registryMetadataObjectKey
    .get(`/${bucketName!}/${registryMetadataObjectKey}`)
    .reply(200, value.registryMetadata)
    .put(`/${bucketName!}/${registryMetadataObjectKey}`)
    .reply(200, (_, body) => {
      value.registryMetadata = JSON.parse(body as string) as ResourcesMetadata;
    })
    // Policies
    .get(new RegExp(`/${bucketName!}${queryParamsSeparatorRegex}${policiesPrefixQueryParamRegex}`))
    .reply(200, () => {
      const filenames = Object.keys(value.policyFiles).map(filename => ({
        Key: `${policiesKeyPrefix}${filename}`,
        LastModified: new Date(),
      }));
      const xmlBuilder = new xml2js.Builder();
      return xmlBuilder.buildObject({ Contents: filenames, IsTruncated: false });
    })
    .get(new RegExp(`/${bucketName!}/${policiesKeyPrefix}.+`))
    .reply(200, uri => {
      const filename = getFilenameFromUri(uri);
      return { Body: value.policyFiles[filename] };
    })
    .put(new RegExp(`/${bucketName!}/${policiesKeyPrefix}.+`))
    .reply(200, (uri, body) => {
      const filename = getFilenameFromUri(uri);
      value.policyFiles[filename] = body as string;
    })
    .delete(new RegExp(`/${bucketName!}/${policiesKeyPrefix}.+`))
    .reply(200, uri => {
      const filename = getFilenameFromUri(uri);
      delete value.policyFiles[filename];
    });

  return value;
}

const getFilenameFromUri = (uri: string) => uri.split('/').slice(-1)[0];

type MockPolicyFiles = { [name: string]: string };
