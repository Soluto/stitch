import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { concatAST, DocumentNode } from 'graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { IResolvers } from '@graphql-tools/utils';
import { sdl as localResolverSdl, directiveSchemaTransformer as localResolverTransformer } from './local-resolver';
import { sdl as enumResolverSdl, directiveSchemaTransformer as enumResolverTransformer } from './enum-resolver';
import { sdl as enumValueSdl, directiveSchemaTransformer as enumValueTransformer } from './enum-value';

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

const baseResolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
};

describe.each(testCases)('EnumResolver Directive', (testCase, { typeDefs, query, variables, expected, resolvers }) => {
  let server: ApolloServerBase;

  beforeAll(() => {
    const schema = localResolverTransformer(
      enumResolverTransformer(
        enumValueTransformer(
          makeExecutableSchema({
            typeDefs: concatAST([typeDefs, baseTypeDefs, localResolverSdl, enumResolverSdl, enumValueSdl]),
            resolvers: { ...baseResolvers, ...resolvers },
          })
        )
      )
    );
    server = new ApolloServer({
      schema,
    });
  });

  afterAll(async () => {
    await server.stop();
  });

  test(testCase, async () => {
    const response = await server.executeOperation({ query, variables });
    expect(response.data).toEqual(expected);
  });
});
