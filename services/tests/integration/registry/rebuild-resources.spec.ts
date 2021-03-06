import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
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
import { AuthType } from '../../../src/modules/registry-schema';

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

const oldSchema: Schema = {
  metadata: { namespace: 'namespace', name: 'name' },
  schema: print(
    gql`
      type Query {
        oldSomething: String!
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
    an: { type: 'String', default: '{source.an}' },
    another: { type: 'String!' },
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
};

describe('Rebuild resource group', () => {
  let client: ApolloServerTestClient;
  let bucketContents: MockResourceBucket;

  beforeAll(() => {
    client = createTestClient(app);
    const initialPolicyFiles = { 'namespace-name.wasm': 'old compiled code' };
    bucketContents = mockResourceBucket({
      registry: baseResourceGroup,
      gateway: {
        ...baseResourceGroup,
        schemas: [oldSchema],
      },
      policyFiles: initialPolicyFiles,
    });
  });

  afterAll(async () => {
    await app.stop();
  });

  it('rebuild resources - dry run', async () => {
    expect(bucketContents.gateway).toMatchSnapshot('before');

    const response = await client.mutate({
      mutation: gql`
        mutation RebuildResourceGroup {
          result: rebuildResourceGroup(dryRun: true) {
            success
          }
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ result: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot('after');
  });

  it('rebuild resources', async () => {
    expect(bucketContents.gateway).toMatchSnapshot('before');

    const response = await client.mutate({
      mutation: gql`
        mutation RebuildResourceGroup {
          result: rebuildResourceGroup {
            success
          }
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ result: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot('after');
  });
});
