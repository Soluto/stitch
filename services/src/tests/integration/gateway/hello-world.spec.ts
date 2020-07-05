import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as Rx from 'rxjs';
import * as nock from 'nock';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import { createStitchGateway } from '../../../modules/gateway';
import { beforeEachDispose } from '../before-each-dispose';

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
  policies: [],
};

describe('Hello world', () => {
  let client: ApolloServerTestClient;

  beforeEachDispose(() => {
    const stitch = createStitchGateway({ resourceGroups: Rx.of(resourceGroup) });
    client = createTestClient(stitch.server);

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
    expect(response.data).toEqual({ hello: 'world!' });
  });
});
