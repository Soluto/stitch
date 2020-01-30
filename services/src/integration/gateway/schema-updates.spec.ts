import {createTestClient, ApolloServerTestClient} from 'apollo-server-testing';
import * as nock from 'nock';
import {gql} from 'apollo-server-core';
import {print} from 'graphql';
import {createApolloServer} from '../../gateway';
import {mockResourceBucketReadsOverTime} from '../resourceBucket';
import {beforeEachDispose} from '../beforeEachDispose';
import {resourceUpdateInterval} from '../../modules/config';

const schema1 = {
    metadata: {
        namespace: 'namespace',
        name: 'name',
    },
    schema: print(gql`
        type Query {
            version: String! @stub(value: "v1")
        }
    `),
};

const schema2 = {
    metadata: {
        namespace: 'namespace',
        name: 'name',
    },
    schema: print(gql`
        type Query {
            version: String! @stub(value: "v2")
        }
    `),
};

const resourceGroup = {
    upstreams: [],
    upstreamClientCredentials: [],
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('Hello world', () => {
    let client: ApolloServerTestClient;

    beforeEachDispose(() => {
        mockResourceBucketReadsOverTime([
            {...resourceGroup, etag: 'v1', schemas: [schema1]},
            {...resourceGroup, etag: 'v2', schemas: [schema2]},
        ]);
        const stitch = createApolloServer();
        client = createTestClient(stitch.server);

        return () => {
            jest.useRealTimers();
            nock.cleanAll();
            return stitch.dispose();
        };
    });

    it('Returns different values after schema updates', async () => {
        const response1 = await client.query({
            query: gql`
                query {
                    version
                }
            `,
        });

        expect(response1.errors).toBeUndefined();
        expect(response1.data).toEqual({version: 'v1'});

        await sleep(resourceUpdateInterval);

        const response2 = await client.query({
            query: gql`
                query {
                    version
                }
            `,
        });

        expect(response2.errors).toBeUndefined();
        expect(response2.data).toEqual({version: 'v2'});
    });
});
