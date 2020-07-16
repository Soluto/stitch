import { promises as fs } from 'fs';
import { exec } from 'child_process';
import * as path from 'path';
import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server-core';
import { mocked } from 'ts-jest/utils';
import * as nock from 'nock';
import { beforeEachDispose } from '../before-each-dispose';
import { app, AuthType } from '../../../src/registry';
import { mockResourceBucket } from '../resource-bucket';
import { ResourceGroup } from '../../../src/modules/resource-repository';
import {
  PolicyType,
  Policy,
  Upstream,
  Schema,
  UpstreamClientCredentials,
} from '../../../src/modules/resource-repository/types';
import { tmpPoliciesDir } from '../../../src/modules/config';
import mockFsForOpa from '../../helpers/mock-fs-for-opa';

jest.mock('child_process', () => ({
  exec: jest.fn((_, cb) => cb()),
}));

const mockedExec = mocked(exec, true);

const schema: Schema = {
  metadata: { namespace: 'namespace', name: 'name' },
  schema: 'type Query { something: String! }',
};
const schemaUpdate: Partial<Schema> = { schema: 'type Query { somethingElse: String! }' };

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

const policy: Policy = {
  metadata: { namespace: 'namespace', name: 'name' },
  type: PolicyType.opa,
  code: `real rego code
           with multiple
           lines`,
  args: {
    an: 'String',
    another: 'String!',
  },
  query: {
    gql: 'some another gql',
    variables: {
      c: 'd',
    },
  },
};
const policyUpdate: Partial<Policy> = { code: 'changed code', args: { just: 'Int' } };

const baseResourceGroup: ResourceGroup = {
  schemas: [schema],
  upstreams: [upstream],
  upstreamClientCredentials: [upstreamClientCredentials],
  policies: [policy],
};
describe('Update resource', () => {
  let client: ApolloServerTestClient;
  let bucketContents: { current: ResourceGroup; policyFiles: { [name: string]: string } };

  beforeEachDispose(() => {
    client = createTestClient(app);
    const initialPolicyFiles = { 'namespace-name.wasm': 'old compiled code' };
    bucketContents = mockResourceBucket(baseResourceGroup, initialPolicyFiles);

    return () => nock.cleanAll();
  });

  it('Schema', async () => {
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
    expect(bucketContents.current).toMatchObject({ ...baseResourceGroup, schemas: [newSchema] });
  });

  it('Upstream', async () => {
    const newUpstream = { ...upstream, ...upstreamUpdate };
    const response = await client.mutate({
      mutation: gql`
        mutation CreateUpstream($upstream: UpstreamInput!) {
          updateUpstreams(input: [$upstream]) {
            success
          }
        }
      `,
      variables: {
        upstream: newUpstream,
      },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ updateUpstreams: { success: true } });
    expect(bucketContents.current).toMatchObject({ ...baseResourceGroup, upstreams: [newUpstream] });
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
    expect(bucketContents.current).toMatchObject({
      ...baseResourceGroup,
      upstreamClientCredentials: [newUpstreamClientCredentials],
    });
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
    expect(bucketContents.current).toMatchObject({ ...baseResourceGroup, policies: [newPolicy] });

    const compiledFilename = 'namespace-name.wasm';
    const uncompiledPath = path.resolve(tmpPoliciesDir, 'namespace-name.rego');
    const compiledPath = path.resolve(tmpPoliciesDir, compiledFilename);
    const regoCode = `package policy\n${newPolicy.code}`;
    expect(fs.writeFile).toHaveBeenCalledWith(uncompiledPath, regoCode);
    expect(fs.unlink).toHaveBeenCalledWith(uncompiledPath);
    expect(fs.unlink).toHaveBeenCalledWith(compiledPath);
    expect(fs.readFile).toHaveBeenCalledWith(compiledPath);
    expect(bucketContents.policyFiles).toEqual({ [compiledFilename]: 'compiled rego code' });

    const expectedCommand = `opa build -d ${uncompiledPath} -o ${compiledPath} 'data.policy = result'`;
    expect(mockedExec.mock.calls[0][0]).toBe(expectedCommand);

    mockFsForOpa.restore();
  });
});
