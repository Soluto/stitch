import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as Rx from 'rxjs';
import { gql } from 'apollo-server-core';
import { print, DocumentNode } from 'graphql';
import * as nock from 'nock';
import { createStitchGateway } from '../../../../src/modules/gateway';
import { Schema } from '../../../../src/modules/resource-repository';

interface TestCase {
  mock: () => nock.Scope;
  schema: DocumentNode;
  query: DocumentNode;
  variables?: Record<string, unknown>;
  skipMockIsDoneAssert?: boolean;
}

const upstreamHost = 'http://localhost:1111';

const testCases: [string, TestCase][] = [
  [
    'Simple GET',
    {
      mock: () => nock(upstreamHost).get('/hello').reply(200, 'world'),
      schema: gql`
        type Query {
          hello: String! @rest(url: "${upstreamHost}/hello")
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
    },
  ],
  [
    'GET with query params',
    {
      mock: () =>
        nock(upstreamHost)
          .get('/hello')
          .query({ name: 'miriam' })
          .reply(200, url => `${new URL(url, upstreamHost).searchParams.get('name')}!`),
      schema: gql`
        type Query {
          hello(name: String!): String! @rest(url: "${upstreamHost}/hello?name={args.name}")
        }
      `,
      query: gql`
        query Hello($name: String!) {
          hello(name: $name)
        }
      `,
      variables: { name: 'miriam' },
    },
  ],
  [
    'POST with predefined body',
    {
      mock: () =>
        nock(upstreamHost)
          .post('/hello', JSON.stringify({ name: 'joseph' }))
          .reply(200, 'world'),
      schema: gql`
        type Query {
          hello(name: String!): String!
            @rest(url: "${upstreamHost}/hello", method: "POST", body: "{{ name: args.name }}")
        }
      `,
      query: gql`
        query Hello($name: String!) {
          hello(name: $name)
        }
      `,
      variables: { name: 'joseph' },
    },
  ],
  [
    'POST with body from input query argument',
    {
      mock: () =>
        nock(upstreamHost)
          .post('/hello', JSON.stringify({ name: 'joseph' }))
          .reply(200, 'world'),
      schema: gql`
        type Query {
          hello(input: JSONObject!): String! @rest(url: "${upstreamHost}/hello", method: "POST")
        }
      `,
      query: gql`
        query Hello($input: JSONObject!) {
          hello(input: $input)
        }
      `,
      variables: { input: { name: 'joseph' } },
    },
  ],
  [
    'POST with body from custom query argument',
    {
      mock: () =>
        nock(upstreamHost)
          .post('/hello', JSON.stringify({ name: 'joseph' }))
          .reply(200, 'world'),
      schema: gql`
        type Query {
          hello(body: JSONObject!): String! @rest(url: "${upstreamHost}/hello", method: "POST", bodyArg: "body")
        }
      `,
      query: gql`
        query Hello($body: JSONObject!) {
          hello(body: $body)
        }
      `,
      variables: { body: { name: 'joseph' } },
    },
  ],
  [
    'Error 401 from upstream',
    {
      mock: () => nock(upstreamHost).get('/hello').reply(401, 'Unauthorized'),
      schema: gql`
        type Query {
          hello: String! @rest(url: "${upstreamHost}/hello")
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
    },
  ],
  [
    'Error 404 from upstream (nullable return type)',
    {
      mock: () => nock(upstreamHost).get('/hello').reply(404, 'Not Found'),
      schema: gql`
        type Query {
          hello: String @rest(url: "${upstreamHost}/hello")
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
    },
  ],
  [
    'Error 404 from upstream (not nullable return type)',
    {
      mock: () => nock(upstreamHost).get('/hello').reply(404, 'Not Found'),
      schema: gql`
        type Query {
          hello: String! @rest(url: "${upstreamHost}/hello")
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
    },
  ],
  [
    'Error 404 from upstream (notFoundAsNull is true)',
    {
      mock: () => nock(upstreamHost).get('/hello').reply(404, 'Not Found'),
      schema: gql`
        type Query {
          hello: String @rest(url: "${upstreamHost}/hello", notFoundAsNull: true)
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
    },
  ],
  [
    'Error 404 from upstream (notFoundAsNull is false)',
    {
      mock: () => nock(upstreamHost).get('/hello').reply(404, 'Not Found'),
      schema: gql`
        type Query {
          hello: String @rest(url: "${upstreamHost}/hello", notFoundAsNull: false)
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
    },
  ],
  [
    'Error 500 from upstream',
    {
      mock: () => nock(upstreamHost).get('/hello').reply(500, 'Internal Server Error'),
      schema: gql`
        type Query {
          hello: String! @rest(url: "${upstreamHost}/hello")
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
    },
  ],
  [
    'Response timeout from upstream',
    {
      mock: () => nock(upstreamHost).get('/hello').delay(1000).reply(200, 'world'),
      schema: gql`
        type Query {
          hello: String! @rest(url: "${upstreamHost}/hello", timeoutMs: 500)
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
      skipMockIsDoneAssert: true,
    },
  ],
  [
    'Connection timeout from upstream',
    {
      mock: () => nock(upstreamHost).get('/hello').delayConnection(1000).reply(200, 'world'),
      schema: gql`
        type Query {
          hello: String! @rest(url: "${upstreamHost}/hello", timeoutMs: 500)
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
      skipMockIsDoneAssert: true,
    },
  ],
  [
    'Empty response body',
    {
      mock: () => nock(upstreamHost).get('/hello').reply(),
      schema: gql`
        type Query {
          hello: String! @rest(url: "${upstreamHost}/hello")
        }
      `,
      query: gql`
        query Hello {
          hello
        }
      `,
    },
  ],
  [
    'Mutation',
    {
      mock: () =>
        nock(upstreamHost)
          .post('/hello', JSON.stringify({ name: 'joseph' }))
          .reply(200, 'world'),
      schema: gql`
        type Mutation {
          hello(name: String!): String!
            @rest(url: "${upstreamHost}/hello", method: "POST", body: "{{ name: args.name }}")
        }
      `,
      query: gql`
        mutation Hello($name: String!) {
          hello(name: $name)
        }
      `,
      variables: { name: 'joseph' },
    },
  ],
];

describe.each(testCases)('Rest directive', (testName, { mock, schema, query, variables, skipMockIsDoneAssert }) => {
  let client: ApolloServerTestClient;
  let disposeServer: any;
  let nockScope: nock.Scope;
  beforeAll(async () => {
    const schemaResource: Schema = {
      metadata: {
        namespace: 'integration-tests',
        name: 'rest-directive',
      },
      schema: print(schema),
    };

    const resourceGroup = {
      etag: 'etag',
      schemas: [schemaResource],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
    };

    const { server, dispose } = createStitchGateway({
      resourceGroups: Rx.of(resourceGroup),
      fastifyInstance: { metrics: undefined as any },
    });
    client = createTestClient(server);
    disposeServer = dispose;

    nockScope = mock();
    expect(nockScope).toBeDefined();
  });

  afterAll(async () => {
    disposeServer && (await disposeServer());
    nock.cleanAll();
  });

  test(testName, async () => {
    const response = await client.query({ query, variables }).catch(e => e.response);
    expect(response).toMatchSnapshot();

    if (!skipMockIsDoneAssert) {
      expect(nockScope.isDone()).toBeTruthy();
    }
  });
});
