import {createTestClient, ApolloServerTestClient} from 'apollo-server-testing';
import * as nock from 'nock';
import {gql} from 'apollo-server-core';
import {print} from 'graphql';
import {createApolloServer} from '../../gateway';
import {mockResourceBucketReads} from '../resourceBucket';
import {beforeEachDispose} from '../beforeEachDispose';

const schema = {
    metadata: {
        namespace: 'namespace',
        name: 'name',
    },
    schema: print(gql`
        type Query {
            hello: String! @stub(value: "world!")
        }
    `),
};

const resourceGroup = {
    etag: 'etag',
    schemas: [schema],
    upstreams: [],
    upstreamClientCredentials: [],
};

describe('Hello world', () => {
    let client: ApolloServerTestClient;

    beforeEachDispose(() => {
        const stitch = createApolloServer();
        client = createTestClient(stitch.server);
        mockResourceBucketReads(resourceGroup);

        return () => {
            nock.cleanAll();
            return stitch.dispose();
        };
    });

    it('Returns basic hello world', async () => {
        const response = await client.query({
            query: gql`
                query {
                    hello
                }
            `,
        });

        expect(response.errors).toBeUndefined();
        expect(response.data).toEqual({hello: 'world!'});
    });
});
