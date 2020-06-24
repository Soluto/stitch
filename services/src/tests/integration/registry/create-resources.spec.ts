import {createTestClient, ApolloServerTestClient} from 'apollo-server-testing';
import {gql} from 'apollo-server-core';
import {mocked} from 'ts-jest/utils';
import {exec} from 'child_process';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as nock from 'nock';
import {beforeEachDispose} from '../beforeEachDispose';
import {app} from '../../../registry';
import {mockResourceBucket} from '../resourceBucket';
import {ResourceGroup} from '../../../modules/resource-repository';
import {PolicyType, Policy} from '../../../modules/resource-repository/types';
import {tmpPoliciesDir} from '../../../modules/config';
import mockFsForOpa from '../../helpers/mockFsForOpa';

jest.mock('child_process', () => ({
    exec: jest.fn((_, cb) => cb()),
}));

const mockedExec = mocked(exec, true);

const schema = {
    metadata: {namespace: 'namespace', name: 'name'},
    schema: 'type Query { something: String! }',
};

const upstream = {
    metadata: {namespace: 'namespace', name: 'name'},
    host: 'test.api',
    auth: {
        type: 'ActiveDirectory',
        activeDirectory: {authority: 'https://authority', resource: 'someResource'},
    },
};

const upstreamClientCredentials = {
    metadata: {namespace: 'namespace', name: 'name'},
    authType: 'ActiveDirectory',
    activeDirectory: {
        authority: 'https://authority',
        clientId: 'myClientId',
        clientSecret: 'myClientSecret',
    },
};

const policy: Policy = {
    metadata: {namespace: 'namespace', name: 'name'},
    type: PolicyType.opa,
    code: `real rego code
           with multiple
           lines`,
    args: {
        an: 'arg',
        another: 'one!',
    },
    query: {
        source: 'some gql',
        variables: {
            a: 'b',
        },
    },
};

const baseResourceGroup = {
    schemas: [],
    upstreams: [],
    upstreamClientCredentials: [],
    policies: [],
};

describe('Create resource', () => {
    let client: ApolloServerTestClient;
    let bucketContents: {current: ResourceGroup; policyFiles: {[name: string]: string}};

    beforeEachDispose(() => {
        client = createTestClient(app);
        bucketContents = mockResourceBucket(baseResourceGroup);

        return () => nock.cleanAll();
    });

    it('Schema', async () => {
        const response = await client.mutate({
            mutation: gql`
                mutation CreateSchema($schema: SchemaInput!) {
                    updateSchemas(input: [$schema]) {
                        success
                    }
                }
            `,
            variables: {
                schema,
            },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data).toEqual({updateSchemas: {success: true}});
        expect(bucketContents.current).toMatchObject({...baseResourceGroup, schemas: [schema]});
    });

    it('Upstream', async () => {
        const response = await client.mutate({
            mutation: gql`
                mutation CreateUpstream($upstream: UpstreamInput!) {
                    updateUpstreams(input: [$upstream]) {
                        success
                    }
                }
            `,
            variables: {
                upstream,
            },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data).toEqual({updateUpstreams: {success: true}});
        expect(bucketContents.current).toMatchObject({...baseResourceGroup, upstreams: [upstream]});
    });

    it('UpstreamClientCredentials', async () => {
        const response = await client.mutate({
            mutation: gql`
                mutation CreateUpstreamClientCredentials($upstreamClientCredentials: UpstreamClientCredentialsInput!) {
                    updateUpstreamClientCredentials(input: [$upstreamClientCredentials]) {
                        success
                    }
                }
            `,
            variables: {
                upstreamClientCredentials,
            },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data).toEqual({updateUpstreamClientCredentials: {success: true}});
        expect(bucketContents.current).toMatchObject({
            ...baseResourceGroup,
            upstreamClientCredentials: [upstreamClientCredentials],
        });
    });

    it('creates an opa type policy', async () => {
        mockFsForOpa.mock();

        const response = await client.mutate({
            mutation: gql`
                mutation CreatePolicy($policy: PolicyInput!) {
                    updatePolicies(input: [$policy]) {
                        success
                    }
                }
            `,
            variables: {
                policy,
            },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data).toEqual({updatePolicies: {success: true}});
        expect(bucketContents.current).toMatchObject({...baseResourceGroup, policies: [policy]});

        const compiledFilename = 'namespace-name.wasm';
        const uncompiledPath = path.resolve(tmpPoliciesDir, 'namespace-name.rego');
        const compiledPath = path.resolve(tmpPoliciesDir, compiledFilename);
        const regoCode = `package policy\n${policy.code}`;
        expect(fs.writeFile).toHaveBeenCalledWith(uncompiledPath, regoCode);
        expect(fs.unlink).toHaveBeenCalledWith(uncompiledPath);
        expect(fs.unlink).toHaveBeenCalledWith(compiledPath);
        expect(fs.readFile).toHaveBeenCalledWith(compiledPath);
        expect(bucketContents.policyFiles).toEqual({[compiledFilename]: 'compiled rego code'});

        const expectedCommand = `opa build -d ${uncompiledPath} -o ${compiledPath} 'data.policy = result'`;
        expect(mockedExec.mock.calls[0][0]).toBe(expectedCommand);

        mockFsForOpa.restore();
    });
});
