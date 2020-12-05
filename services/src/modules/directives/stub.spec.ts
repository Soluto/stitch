import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { concatAST, DocumentNode } from 'graphql';
import { IResolvers, SchemaDirectiveVisitor } from 'graphql-tools';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { sdl as stubSdl, StubDirective } from './stub';

interface TestCase {
  typeDefs: DocumentNode;
  query: DocumentNode;
  rootValue?: unknown;
  variables?: Record<string, unknown>;
  expected: unknown;
}

const testCases: [string, TestCase][] = [
  [
    'Static value',
    {
      typeDefs: gql`
        type Query {
          foo: String! @stub(value: "bar")
        }
      `,
      query: gql`
        query {
          foo
        }
      `,
      expected: { foo: 'bar' },
    },
  ],
  [
    'Argument',
    {
      typeDefs: gql`
        type Query {
          foo(arg1: String): String! @stub(value: "{args.arg1}")
        }
      `,
      query: gql`
        query {
          foo(arg1: "bar")
        }
      `,
      expected: { foo: 'bar' },
    },
  ],
  [
    'Source',
    {
      typeDefs: gql`
        type Query {
          foo: String! @stub(value: "{source.bar}")
        }
      `,
      query: gql`
        query {
          foo
        }
      `,
      rootValue: { bar: 'bar' },
      expected: { foo: 'bar' },
    },
  ],
  [
    'Variable',
    {
      typeDefs: gql`
        type Query {
          foo: String! @stub(value: "{vars.var1}")
        }
      `,
      query: gql`
        query($var1: String!) {
          foo @keepStringVariable(var: $var1)
        }
      `,
      variables: {
        var1: 'bar',
      },
      expected: { foo: 'bar' },
    },
  ],
];

const baseTypeDefs = gql`
  scalar JSON
  scalar JSONObject

  directive @keepStringVariable(var: String!) on FIELD
`;

const schemaDirectives: Record<string, typeof SchemaDirectiveVisitor> = {
  stub: StubDirective,
};

const resolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
};

describe.each(testCases)('Stub Directive', (testCase, { typeDefs, query, variables, rootValue, expected }) => {
  let client: ApolloServerTestClient;
  let server: ApolloServerBase;

  beforeAll(() => {
    server = new ApolloServer({
      typeDefs: concatAST([typeDefs, baseTypeDefs, stubSdl]),
      schemaDirectives,
      resolvers,
      rootValue,
    });
    client = createTestClient(server);
  });

  afterAll(async () => {
    await server.stop();
  });

  test(testCase, async () => {
    const response = await client.query({ query, variables });
    expect(response.data).toEqual(expected);
  });
});
