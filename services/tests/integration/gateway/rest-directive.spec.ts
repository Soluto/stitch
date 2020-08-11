import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as Rx from 'rxjs';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import * as nock from 'nock';
import { createStitchGateway } from '../../../src/modules/gateway';
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

      helloPost(name: String!): String!
        @rest(url: "http://test.api/hello", method: "POST", body: "{{ name: args.name }}")

      helloPostBody(input: JSONObject!): String! @rest(url: "http://test.api/hello", method: "POST")

      helloPostBodyArg(body: JSONObject!): String! @rest(url: "http://test.api/hello", method: "POST", bodyArg: "body")
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

  it('Post method with argument injection to predefined body', async () => {
    const response = await client.query({
      query: gql`
        query HelloPost($name: String!) {
          helloPost(name: $name)
        }
      `,
      variables: { name: 'joseph' },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ helloPost: 'world' });
  });

  it('Post method with body as query argument', async () => {
    const response = await client.query({
      query: gql`
        query HelloPostBody($input: JSONObject!) {
          helloPostBody(input: $input)
        }
      `,
      variables: { input: { name: 'joseph' } },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ helloPostBody: 'world' });
  });

  it('Post method with body as query argument', async () => {
    const response = await client.query({
      query: gql`
        query HelloPostBodyArg($body: JSONObject!) {
          helloPostBodyArg(body: $body)
        }
      `,
      variables: { body: { name: 'joseph' } },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ helloPostBodyArg: 'world' });
  });
});

function mockRestBackend(host: string) {
  return nock(host)
    .get('/hello')
    .reply(200, 'world!')
    .get('/hello')
    .query({ name: 'miriam' })
    .reply(200, url => `${new URL(url, host).searchParams.get('name')}!`)
    .post('/hello', JSON.stringify({ name: 'joseph' }))
    .reply(200, 'world');
}
