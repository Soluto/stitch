import {createTestClient, ApolloServerTestClient} from 'apollo-server-testing';
import {gql} from 'apollo-server-core';
import * as nock from 'nock';
import {beforeEachDispose} from '../beforeEachDispose';
import {app, AuthType} from '../../registry';
import {mockResourceBucket} from '../resourceBucket';
import {ResourceGroup} from '../../modules/resource-repository';

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

const baseResourceGroup = {
    schemas: [schema],
    upstreams: [upstream],
    upstreamClientCredentials: [upstreamClientCredentials],
};
describe('Update resource', () => {
    let client: ApolloServerTestClient;
    let bucketContents: {current: ResourceGroup};

    beforeEachDispose(() => {
        client = createTestClient(app);
        bucketContents = mockResourceBucket(baseResourceGroup);

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
        expect(bucketContents.current).toEqual({...baseResourceGroup, schemas: [newSchema]});
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
        expect(bucketContents.current).toEqual({...baseResourceGroup, upstreams: [newUpstream]});
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
        expect(bucketContents.current).toEqual({
            ...baseResourceGroup,
            upstreamClientCredentials: [newUpstreamClientCredentials],
        });
    });
});
