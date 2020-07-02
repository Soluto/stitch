import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as Rx from 'rxjs';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import * as nock from 'nock';
import { createStitchGateway } from '../../../modules/gateway';
import { beforeEachDispose } from '../before-each-dispose';

const schema = {
  metadata: {
    namespace: 'namespace',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      hello: String! @rest(url: "http://test.api/hello")
      helloByName(name: String!): String! @rest(url: "http://test.api/hello?name={args.name}")
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

describe('Rest Directive', () => {
  let client: ApolloServerTestClient;

  beforeEachDispose(() => {
    mockRestBackend('http://test.api');

    const stitch = createStitchGateway({ resourceGroups: Rx.of(resourceGroup) });
    client = createTestClient(stitch.server);

    return () => {
      nock.cleanAll();
      return stitch.dispose();
    };
  });

  it('Hello world', async () => {
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

  it('Arguments are passed through with variables', async () => {
    const response = await client.query({
      query: gql`
        query HelloByName($name: String!) {
          helloByName(name: $name)
        }
      `,
      variables: { name: 'miriam' },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ helloByName: 'miriam!' });
  });
});

function mockRestBackend(host: string) {
  return nock(host)
    .get('/hello')
    .reply(200, 'world!')
    .get('/hello')
    .query({ name: 'miriam' })
    .reply(200, (url) => new URL(url, host).searchParams.get('name') + '!');
}
