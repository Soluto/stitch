import {createTestClient, ApolloServerTestClient} from 'apollo-server-testing';
import {gql} from 'apollo-server-core';
import * as nock from 'nock';
import {beforeEachDispose} from '../beforeEachDispose';
import {app} from '../../registry';
import {mockResourceBucket} from '../resourceBucket';
import {ResourceGroup} from '../../modules/resource-repository';

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

const baseResourceGroup = {schemas: [], upstreams: [], upstreamClientCredentials: []};
describe('Create resource', () => {
    let client: ApolloServerTestClient;
    let bucketContents: {current: ResourceGroup};

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
        expect(bucketContents.current).toEqual({...baseResourceGroup, schemas: [schema]});
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
        expect(bucketContents.current).toEqual({...baseResourceGroup, upstreams: [upstream]});
    });

    it('UpstreamClientCredentials', async () => {
        const response = await client.mutate({
            mutation: gql`
                mutation CreateUpstream($upstreamClientCredentials: UpstreamClientCredentialsInput!) {
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
        expect(bucketContents.current).toEqual({
            ...baseResourceGroup,
            upstreamClientCredentials: [upstreamClientCredentials],
        });
    });
});
