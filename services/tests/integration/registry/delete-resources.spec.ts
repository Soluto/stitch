import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import * as nock from 'nock';
import { beforeEachDispose } from '../before-each-dispose';
import { app } from '../../../src/registry';
import { MockResourceBucket, mockResourceBucket } from '../resource-bucket';
import { ResourceGroup } from '../../../src/modules/resource-repository';
import {
  PolicyType,
  PolicyDefinition,
  Upstream,
  Schema,
  UpstreamClientCredentials,
} from '../../../src/modules/resource-repository/types';
import mockFsForOpa from '../../helpers/mock-fs-for-opa';
import { AuthType } from '../../../src/modules/registry-schema';

jest.mock('child_process', () => ({
  exec: jest.fn((_, cb) => cb()),
}));

const schema: Schema = {
  metadata: { namespace: 'namespace', name: 'name' },
  schema: print(
    gql`
      type Query {
        something: String!
      }
    `
  ),
};

const upstream: Upstream = {
  metadata: { namespace: 'namespace', name: 'name' },
  host: 'test.api',
  auth: {
    type: AuthType.ActiveDirectory,
    activeDirectory: { authority: 'https://authority', resource: 'someResource' },
  },
};

const upstreamClientCredentials: UpstreamClientCredentials = {
  metadata: { namespace: 'namespace', name: 'name' },
  authType: AuthType.ActiveDirectory,
  activeDirectory: {
    authority: 'https://authority',
    clientId: 'myClientId',
    clientSecret: 'myClientSecret',
  },
};

const policy: PolicyDefinition = {
  metadata: { namespace: 'namespace', name: 'name' },
  type: PolicyType.opa,
  code: `real rego code
           with multiple
           lines`,
  args: {
    an: {
      type: 'String',
      optional: true,
    },
    another: {
      type: 'String!',
      optional: false,
    },
  },
  query: {
    gql: 'some another gql',
    variables: {
      c: 'd',
    },
  },
};

const baseResourceGroup: ResourceGroup = {
  schemas: [schema],
  upstreams: [upstream],
  upstreamClientCredentials: [upstreamClientCredentials],
  policies: [policy],
  defaultUpstream: { targetOrigin: 'http://localhost:8080' },
};
describe('Delete resource', () => {
  let bucketContents: MockResourceBucket;

  beforeEachDispose(() => {
    const initialPolicyFiles = { 'namespace-name.wasm': 'old compiled code' };
    bucketContents = mockResourceBucket({ registry: baseResourceGroup, policyFiles: initialPolicyFiles });

    return () => nock.cleanAll();
  });

  it('deletes a Schema', async () => {
    const schemaToDelete = schema.metadata;
    const response = await app.executeOperation({
      query: gql`
        mutation DeleteSchemas($schemas: [ResourceMetadataInput!]!) {
          deleteSchemas(input: $schemas) {
            success
          }
        }
      `,
      variables: {
        schemas: [schemaToDelete],
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ deleteSchemas: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('deletes a Schema using deleteResources', async () => {
    const schemaToDelete = schema.metadata;
    const response = await app.executeOperation({
      query: gql`
        mutation DeleteResources($resourceGroupMetadata: ResourceGroupMetadataInput!) {
          deleteResources(input: $resourceGroupMetadata) {
            success
          }
        }
      `,
      variables: {
        resourceGroupMetadata: { schemas: [schemaToDelete] },
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ deleteResources: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('deletes an Upstream', async () => {
    const upstreamToDelete = upstream.metadata;
    const response = await app.executeOperation({
      query: gql`
        mutation DeleteUpstreams($upstreams: [ResourceMetadataInput!]!) {
          deleteUpstreams(input: $upstreams) {
            success
          }
        }
      `,
      variables: {
        upstreams: [upstreamToDelete],
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ deleteUpstreams: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('reset an Default Upstream', async () => {
    const response = await app.executeOperation({
      query: gql`
        mutation ResetDefaultUpstreams {
          resetDefaultUpstream(input: true) {
            success
          }
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ resetDefaultUpstream: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('deletes an UpstreamClientCredentials', async () => {
    const upstreamClientCredentialsToDelete = upstreamClientCredentials.metadata;

    const response = await app.executeOperation({
      query: gql`
        mutation DeleteUpstreamCredentials($upstreamClientCredentials: [ResourceMetadataInput!]!) {
          deleteUpstreamClientCredentials(input: $upstreamClientCredentials) {
            success
          }
        }
      `,
      variables: {
        upstreamClientCredentials: [upstreamClientCredentialsToDelete],
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ deleteUpstreamClientCredentials: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('delete an opa type policy', async () => {
    mockFsForOpa.mock();

    const policyToDelete = policy.metadata;
    const response = await app.executeOperation({
      query: gql`
        mutation DeletePolicies($policies: [ResourceMetadataInput!]!) {
          deletePolicies(input: $policies) {
            success
          }
        }
      `,
      variables: {
        policies: [policyToDelete],
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ deletePolicies: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
    expect(bucketContents.policyFiles).toMatchSnapshot();

    mockFsForOpa.restore();
  });

  it('deletes an opa type policy using deleteResources', async () => {
    mockFsForOpa.mock();

    const policyToDelete = policy.metadata;
    const response = await app.executeOperation({
      query: gql`
        mutation DeleteResources($resources: ResourceGroupMetadataInput!) {
          deleteResources(input: $resources) {
            success
          }
        }
      `,
      variables: {
        resources: { policies: [policyToDelete] },
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ deleteResources: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
    expect(bucketContents.policyFiles).toMatchSnapshot();

    mockFsForOpa.restore();
  });
});
