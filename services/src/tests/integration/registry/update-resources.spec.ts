import {createTestClient, ApolloServerTestClient} from 'apollo-server-testing';
import {gql} from 'apollo-server-core';
import {mocked} from 'ts-jest/utils';
import {exec} from 'child_process';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as nock from 'nock';
import {beforeEachDispose} from '../beforeEachDispose';
import {app, AuthType} from '../../../registry';
import {mockResourceBucket} from '../resourceBucket';
import {ResourceGroup} from '../../../modules/resource-repository';
import {PolicyType, PolicyQueryType} from '../../../modules/resource-repository/types';
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
const schemaUpdate = {schema: 'type Query { somethingElse: String! }'};

const upstream = {
    metadata: {namespace: 'namespace', name: 'name'},
    host: 'test.api',
    auth: {
        type: AuthType.ActiveDirectory,
        activeDirectory: {authority: 'https://authority', resource: 'someResource'},
    },
};
const upstreamUpdate = {host: 'test2.api'};

const upstreamClientCredentials = {
    metadata: {namespace: 'namespace', name: 'name'},
    authType: AuthType.ActiveDirectory,
    activeDirectory: {
        authority: 'https://authority',
        clientId: 'myClientId',
        clientSecret: 'myClientSecret',
    },
};
const upstreamClientCredentialsActiveDirectoryUpdate = {clientSecret: 'myOtherClientSecret'};

const policy = {
    metadata: {namespace: 'namespace', name: 'name'},
    type: PolicyType.opa,
    code: `real rego code
           with multiple
           lines`,
    args: {
        an: 'arg',
        another: 'one!',
    },
    queries: [
        {type: PolicyQueryType.graphql, name: 'someGraphqlQuery', graphql: {query: 'actual gql'}},
        {
            type: PolicyQueryType.policy,
            name: 'somePolicyQuery',
            policy: {policyName: 'someOtherPolicy', args: {some: 'arg for the other policy'}},
        },
    ],
};
const policyUpdate = {code: 'changed code', args: {just: 'one arg'}};

const baseResourceGroup = {
    schemas: [schema],
    upstreams: [upstream],
    upstreamClientCredentials: [upstreamClientCredentials],
    policies: [policy],
};
describe('Update resource', () => {
    let client: ApolloServerTestClient;
    let bucketContents: {current: ResourceGroup; policyFiles: {[name: string]: string}};

    beforeEachDispose(() => {
        client = createTestClient(app);
        const initialPolicyFiles = {'namespace-name.wasm': 'old compiled code'};
        bucketContents = mockResourceBucket(baseResourceGroup, initialPolicyFiles);

        return () => nock.cleanAll();
    });

    it('Schema', async () => {
        const newSchema = {...schema, ...schemaUpdate};
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
        expect(response.data).toEqual({updateSchemas: {success: true}});
        expect(bucketContents.current).toMatchObject({...baseResourceGroup, schemas: [newSchema]});
    });

    it('Upstream', async () => {
        const newUpstream = {...upstream, ...upstreamUpdate};
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
        expect(response.data).toEqual({updateUpstreams: {success: true}});
        expect(bucketContents.current).toMatchObject({...baseResourceGroup, upstreams: [newUpstream]});
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
        expect(response.data).toEqual({updateUpstreamClientCredentials: {success: true}});
        expect(bucketContents.current).toMatchObject({
            ...baseResourceGroup,
            upstreamClientCredentials: [newUpstreamClientCredentials],
        });
    });

    it('updates an opa type policy', async () => {
        mockFsForOpa.mock();

        const newPolicy = {...policy, ...policyUpdate};
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
        expect(response.data).toEqual({updatePolicies: {success: true}});
        expect(bucketContents.current).toMatchObject({...baseResourceGroup, policies: [newPolicy]});

        const compiledFilename = 'namespace-name.wasm';
        const uncompiledPath = path.resolve(tmpPoliciesDir, 'namespace-name.rego');
        const compiledPath = path.resolve(tmpPoliciesDir, compiledFilename);
        const regoCode = `package policy\n${newPolicy.code}`;
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
