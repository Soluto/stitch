import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer, IResolvers, SchemaDirectiveVisitor } from 'apollo-server-fastify';
import { concatAST, DocumentNode } from 'graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { sdl as localResolverSdl, LocalResolverDirective } from './local-resolver';
import { sdl as enumResolverSdl, EnumResolverDirective, EnumValueDirective } from './enum-resolver';

interface TestCase {
  typeDefs: DocumentNode;
  resolvers?: IResolvers;
  query: DocumentNode;
  variables?: Record<string, unknown>;
  expected: unknown;
}

enum Foo {
  Bar = 'bar',
}

const testCases: [string, TestCase][] = [
  [
    'Enum is return type with resolver',
    {
      typeDefs: gql`
        type Query {
          foo: Foo
        }
      `,
      resolvers: {
        Query: {
          foo: () => Foo.Bar,
        },
      },
      query: gql`
        query {
          foo
        }
      `,
      expected: { foo: 'Bar' },
    },
  ],
  [
    'Enum is return type with @localResolver',
    {
      typeDefs: gql`
        type Query {
          foo: Foo @localResolver(value: "bar")
        }
      `,
      query: gql`
        query {
          foo
        }
      `,
      expected: { foo: 'Bar' },
    },
  ],
  [
    'Enum is query argument with resolver',
    {
      typeDefs: gql`
        type Query {
          foo(f: Foo): Boolean
        }
      `,
      resolvers: {
        Query: {
          foo: (_, args: { f: Foo }) => args.f === Foo.Bar,
        },
      },
      query: gql`
        query {
          foo(f: Bar)
        }
      `,
      expected: { foo: true },
    },
  ],
  [
    'Enum is query argument with variable with resolver',
    {
      typeDefs: gql`
        type Query {
          foo(f: Foo): Boolean
        }
      `,
      resolvers: {
        Query: {
          foo: (_, args: { f: Foo }) => args.f === Foo.Bar,
        },
      },
      query: gql`
        query($f: Foo) {
          foo(f: $f)
        }
      `,
      variables: {
        f: 'Bar',
      },
      expected: { foo: true },
    },
  ],
];

const baseTypeDefs = gql`
  scalar JSON
  scalar JSONObject

  enum Foo @enumResolver {
    Bar @enumValue(value: "bar")
  }
`;

const schemaDirectives: Record<string, typeof SchemaDirectiveVisitor> = {
  localResolver: LocalResolverDirective,
  enumResolver: EnumResolverDirective,
  enumValue: EnumValueDirective,
};

const baseResolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
};

describe.each(testCases)('EnumResolver Directive', (testCase, { typeDefs, query, variables, expected, resolvers }) => {
  let client: ApolloServerTestClient;
  let server: ApolloServerBase;

  beforeAll(() => {
    server = new ApolloServer({
      typeDefs: concatAST([typeDefs, baseTypeDefs, localResolverSdl, enumResolverSdl]),
      schemaDirectives,
      resolvers: { ...baseResolvers, ...resolvers },
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
