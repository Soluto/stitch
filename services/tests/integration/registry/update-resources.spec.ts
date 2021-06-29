import { promises as fs } from 'fs';
import { exec } from 'child_process';
import * as path from 'path';
import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server-core';
import { graphqlSync, print } from 'graphql';
import { mocked } from 'ts-jest/utils';
import * as nock from 'nock';
import { makeExecutableSchema } from 'graphql-tools';
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
import { tmpPoliciesDir } from '../../../src/modules/config';
import mockFsForOpa from '../../helpers/mock-fs-for-opa';
import { AuthType } from '../../../src/modules/registry-schema';
import { getOpaBuildWasmCommand } from '../../../src/modules/opa-helper';

jest.mock('child_process', () => ({
  exec: jest.fn((_, cb) => cb()),
}));

const mockedExec = mocked(exec, true);

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
const schemaUpdate: Partial<Schema> = {
  schema: print(
    gql`
      type Query {
        somethingElse: String!
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
const upstreamUpdate: Partial<Upstream> = { host: 'test2.api' };

const upstreamClientCredentials: UpstreamClientCredentials = {
  metadata: { namespace: 'namespace', name: 'name' },
  authType: AuthType.ActiveDirectory,
  activeDirectory: {
    authority: 'https://authority',
    clientId: 'myClientId',
    clientSecret: 'myClientSecret',
  },
};
const upstreamClientCredentialsActiveDirectoryUpdate = { clientSecret: 'myOtherClientSecret' };

const policy: PolicyDefinition = {
  metadata: { namespace: 'namespace', name: 'name' },
  type: PolicyType.opa,
  code: `real rego code
           with multiple
           lines`,
  args: {
    an: { type: 'String', default: '{source.an}', optional: true },
    another: { type: 'String!', optional: false },
  },
  query: {
    gql: 'some another gql',
    variables: {
      c: 'd',
    },
  },
};
const policyUpdate: Partial<PolicyDefinition> = { code: 'changed code', args: { just: { type: 'Int' } } };

const baseResourceGroup: ResourceGroup = {
  schemas: [schema],
  upstreams: [upstream],
  upstreamClientCredentials: [upstreamClientCredentials],
  policies: [policy],
};
describe('Update resource', () => {
  let client: ApolloServerTestClient;
  let bucketContents: MockResourceBucket;

  beforeEachDispose(() => {
    client = createTestClient(app);
    const initialPolicyFiles = { 'namespace-name.wasm': 'old compiled code' };
    bucketContents = mockResourceBucket({ registry: baseResourceGroup, policyFiles: initialPolicyFiles });

    return () => nock.cleanAll();
  });

  it('updates a Schema', async () => {
    const newSchema = { ...schema, ...schemaUpdate };
    const response = await client.mutate({
      mutation: gql`
        mutation CreateSchema($schema: SchemaInput!) {
          updateSchemas(input: [$schema]) {
            success
          }
        }
      `,
      variables: {
        schema: newSchema,
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ updateSchemas: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('update a Schema with wrong input', async () => {
    const wrongSchemaUpdate: Partial<Schema> = {
      schema: print(gql`
        type Query {
          someFoo: Foo!
        }
      `),
    };
    const newSchema = { ...schema, ...wrongSchemaUpdate };
    const response = await client.mutate({
      mutation: gql`
        mutation CreateSchema($schema: SchemaInput!) {
          updateSchemas(input: [$schema]) {
            success
          }
        }
      `,
      variables: {
        schema: newSchema,
      },
    });

    expect(response.errors).toBeDefined();
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('updates a Schema using updateResourceGroup', async () => {
    const newSchema = { ...schema, ...schemaUpdate };
    const response = await client.mutate({
      mutation: gql`
        mutation UploadResources($resourceGroup: ResourceGroupInput!) {
          updateResourceGroup(input: $resourceGroup) {
            success
          }
        }
      `,
      variables: {
        resourceGroup: { schemas: [newSchema] },
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ updateResourceGroup: { success: true } });
    expect(bucketContents.gateway).toMatchObject({ ...baseResourceGroup, schemas: [newSchema] });
  });

  it('updates a Schema with @gql directive', async () => {
    const schemaWithGql: Partial<Schema> = {
      schema: print(gql`
        type Query {
          someGql: String! @gql(url: "http://remote-server/graphql", fieldName: "someRemoteGql")
        }
      `),
    };

    const remoteSchema = gql`
      type Query {
        someRemoteGql: String!
      }
    `;

    nock('http://remote-server')
      .persist()
      .post('/graphql')
      .reply(200, (_url, body: Record<string, any>) =>
        graphqlSync({
          schema: makeExecutableSchema({ typeDefs: remoteSchema }),
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        })
      );

    const newSchema = { ...schema, ...schemaWithGql };
    const response = await client.mutate({
      mutation: gql`
        mutation UploadResources($resourceGroup: ResourceGroupInput!) {
          updateResourceGroup(input: $resourceGroup) {
            success
          }
        }
      `,
      variables: {
        resourceGroup: { schemas: [newSchema] },
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ updateResourceGroup: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('Upstream', async () => {
    const newUpstream = { ...upstream, ...upstreamUpdate };
    const upstreamWithoutAuth: Upstream = {
      metadata: { namespace: 'namespace', name: 'upstreamWithoutAuth' },
      host: 'some-host',
    };
    const upstreamWithSourceHosts: Upstream = {
      metadata: { namespace: 'namespace', name: 'upstreamWithSourceHosts' },
      sourceHosts: ['some-host-2'],
    };
    const response = await client.mutate({
      mutation: gql`
        mutation CreateUpstream($upstreams: [UpstreamInput!]!) {
          updateUpstreams(input: $upstreams) {
            success
          }
        }
      `,
      variables: {
        upstreams: [newUpstream, upstreamWithoutAuth, upstreamWithSourceHosts],
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ updateUpstreams: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('UpstreamClientCredentials', async () => {
    const newUpstreamClientCredentials = {
      ...upstreamClientCredentials,
      activeDirectory: {
        ...upstreamClientCredentials.activeDirectory,
        ...upstreamClientCredentialsActiveDirectoryUpdate,
      },
    };

    const response = await client.mutate({
      mutation: gql`
        mutation CreateUpstream($upstreamClientCredentials: UpstreamClientCredentialsInput!) {
          updateUpstreamClientCredentials(input: [$upstreamClientCredentials]) {
            success
          }
        }
      `,
      variables: {
        upstreamClientCredentials: newUpstreamClientCredentials,
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ updateUpstreamClientCredentials: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();
  });

  it('updates an opa type policy', async () => {
    mockFsForOpa.mock();

    const newPolicy = { ...policy, ...policyUpdate };
    const response = await client.mutate({
      mutation: gql`
        mutation CreatePolicy($policy: PolicyInput!) {
          updatePolicies(input: [$policy]) {
            success
          }
        }
      `,
      variables: {
        policy: newPolicy,
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ updatePolicies: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();

    const compiledFilename = 'namespace-name.wasm';
    const uncompiledPath = path.resolve(tmpPoliciesDir, 'namespace-name.rego');
    const compiledPath = path.resolve(tmpPoliciesDir, compiledFilename);
    const regoCode = `package policy\n${newPolicy.code}`;
    expect(fs.writeFile).toHaveBeenCalledWith(uncompiledPath, regoCode);
    expect(fs.unlink).toHaveBeenCalledWith(uncompiledPath);
    expect(fs.unlink).toHaveBeenCalledWith(compiledPath);
    expect(fs.readFile).toHaveBeenCalledWith(compiledPath);
    expect(bucketContents.policyFiles).toMatchSnapshot();

    const expectedCommand = getOpaBuildWasmCommand(uncompiledPath, compiledPath);
    expect(mockedExec.mock.calls[0][0]).toBe(expectedCommand);

    mockFsForOpa.restore();
  });

  it('updates an opa type policy using updateResourceGroup', async () => {
    mockFsForOpa.mock();

    const newPolicy = { ...policy, ...policyUpdate };
    const response = await client.mutate({
      mutation: gql`
        mutation UploadResources($resourceGroup: ResourceGroupInput!) {
          updateResourceGroup(input: $resourceGroup) {
            success
          }
        }
      `,
      variables: {
        resourceGroup: { policies: [newPolicy] },
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ updateResourceGroup: { success: true } });
    expect(bucketContents.gateway).toMatchSnapshot();

    const compiledFilename = 'namespace-name.wasm';
    const uncompiledPath = path.resolve(tmpPoliciesDir, 'namespace-name.rego');
    const compiledPath = path.resolve(tmpPoliciesDir, compiledFilename);
    const regoCode = `package policy\n${newPolicy.code}`;
    expect(fs.writeFile).toHaveBeenCalledWith(uncompiledPath, regoCode);
    expect(fs.unlink).toHaveBeenCalledWith(uncompiledPath);
    expect(fs.unlink).toHaveBeenCalledWith(compiledPath);
    expect(fs.readFile).toHaveBeenCalledWith(compiledPath);
    expect(bucketContents.policyFiles).toMatchSnapshot();

    const expectedCommand = getOpaBuildWasmCommand(uncompiledPath, compiledPath);
    expect(mockedExec.mock.calls[0][0]).toBe(expectedCommand);

    mockFsForOpa.restore();
  });
});
