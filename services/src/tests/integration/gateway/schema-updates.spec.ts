import {createTestClient, ApolloServerTestClient} from 'apollo-server-testing';
import * as Rx from 'rxjs';
import * as nock from 'nock';
import {gql} from 'apollo-server-core';
import {print} from 'graphql';
import {createStitchGateway} from '../../../modules/gateway';
import {beforeEachDispose} from '../beforeEachDispose';
import {ResourceGroup} from '../../../modules/resource-repository';

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

describe('Hello world', () => {
    let client: ApolloServerTestClient;
    let resourceGroups: Rx.BehaviorSubject<ResourceGroup>;

    beforeEachDispose(() => {
        resourceGroups = new Rx.BehaviorSubject({...resourceGroup, schemas: [schema1]} as ResourceGroup);
        const stitch = createStitchGateway({resourceGroups});
        client = createTestClient(stitch.server);

        return () => {
            jest.useRealTimers();
            nock.cleanAll();
            resourceGroups.complete();
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

        resourceGroups.next({...resourceGroup, schemas: [schema2]});

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
