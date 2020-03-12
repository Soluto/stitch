import {createTestClient, ApolloServerTestClient} from 'apollo-server-testing';
import * as Rx from 'rxjs';
import * as nock from 'nock';
import {gql} from 'apollo-server-core';
import {print} from 'graphql';
import {createStitchGateway} from '../../../modules/gateway';
import {beforeEachDispose} from '../beforeEachDispose';

const schema = {
    metadata: {
        namespace: 'namespace',
        name: 'name',
    },
    schema: print(gql`
        type Query {
            date: Date! @stub(value: "1991-10-05")
            dateTime: DateTime! @stub(value: "2008-03-07T19:33:15.233Z")
            timestamp: DateTime! @stub(value: 1582114537)
            time: Time! @stub(value: "19:33:15.233Z")
            rawJson: JSON! @stub(value: {a: {nested: {structure: 123}}})
            jsonArray: JSON! @stub(value: [1, 2, 3])
            jsonObject: JSONObject! @stub(value: {hello: "world"})
        }
    `),
};

const resourceGroup = {
    etag: 'etag',
    schemas: [schema],
    upstreams: [],
    upstreamClientCredentials: [],
};

describe('Custom scalars', () => {
    let client: ApolloServerTestClient;

    beforeEachDispose(() => {
        const stitch = createStitchGateway({resourceGroups: Rx.of(resourceGroup)});
        client = createTestClient(stitch.server);

        return () => {
            nock.cleanAll();
            return stitch.dispose();
        };
    });

    it('DateTime/Date/Time scalars', async () => {
        const response = await client.query({
            query: gql`
                query {
                    date
                    dateTime
                    timestamp
                    time
                }
            `,
        });

        expect(response.errors).toBeUndefined();
        expect(response.data).toEqual({
            date: '1991-10-05',
            dateTime: '2008-03-07T19:33:15.233Z',
            timestamp: '2020-02-19T12:15:37.000Z',
            time: '19:33:15.233Z',
        });
    });

    it('JSON/JSONObject scalars', async () => {
        const response = await client.query({
            query: gql`
                query {
                    rawJson
                    jsonArray
                    jsonObject
                }
            `,
        });

        expect(response.errors).toBeUndefined();
        expect(response.data).toEqual({
            rawJson: {a: {nested: {structure: 123}}},
            jsonArray: [1, 2, 3],
            jsonObject: {hello: 'world'},
        });
    });
});
