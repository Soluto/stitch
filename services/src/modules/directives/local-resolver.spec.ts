import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer, SchemaDirectiveVisitor } from 'apollo-server-fastify';
import { concatAST, DocumentNode } from 'graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { GraphQLResolverMap } from 'apollo-graphql';
import { sdl as localResolverSdl, LocalResolverDirective } from './local-resolver';

interface TestCase {
  typeDefs: DocumentNode;
  query?: DocumentNode;
  rootValue?: unknown;
  variables?: Record<string, unknown>;
  expected?: unknown;
  resolvers?: GraphQLResolverMap;
  only?: boolean;
}

const defaultQuery = gql`
  query {
    foo {
      field1
      field2
      field3
    }
  }
`;
const defaultExpected = { foo: { field1: 'value1', field2: 'value2', field3: 'bar' } };
const defaultResolvers = {
  Query: {
    foo: () => ({ field1: 'value1', field2: 'value2' }),
  },
};

const testCases: [string, TestCase][] = [
  [
    'Static value',
    {
      typeDefs: gql`
        type Query {
          foo: SomeType! @localResolver(value: { field3: "bar" }, mergeStrategy: Merge)
        }
      `,
    },
  ],
  [
    'Argument',
    {
      typeDefs: gql`
        type Query {
          foo(arg1: String): SomeType! @localResolver(value: { field3: "{args.arg1}" }, mergeStrategy: Merge)
        }
      `,
      query: gql`
        query {
          foo(arg1: "bar") {
            field1
            field2
            field3
          }
        }
      `,
    },
  ],
  [
    'Source',
    {
      typeDefs: gql`
        type Query {
          foo: SomeType! @localResolver(value: { field3: "{source.bar}" }, mergeStrategy: Merge)
        }
      `,
      rootValue: { bar: 'bar' },
    },
  ],
  [
    'Variable',
    {
      typeDefs: gql`
        type Query {
          foo: SomeType! @localResolver(value: { field3: "{vars.var1}" }, mergeStrategy: Merge)
        }
      `,
      query: gql`
        query($var1: String!) {
          foo @keepStringVariable(var: $var1) {
            field1
            field2
            field3
          }
        }
      `,
      variables: { var1: 'bar' },
    },
  ],
  [
    'MergeDeep',
    {
      typeDefs: gql`
        type NestedType {
          nestedField: SomeType!
        }

        type Query {
          foo: NestedType! @localResolver(value: { nestedField: { field1: "mergedDeep" } }, mergeStrategy: MergeDeep)
        }
      `,
      query: gql`
        query {
          foo {
            nestedField {
              field1
              field2
              field3
            }
          }
        }
      `,
      expected: { foo: { nestedField: { field1: 'mergedDeep', field2: 'value2', field3: 'value3' } } },
      resolvers: {
        Query: {
          foo: () => ({ nestedField: { field1: 'value1', field2: 'value2', field3: 'value3' } }),
        },
      },
    },
  ],
  [
    'Replace',
    {
      typeDefs: gql`
        type Query {
          foo(arg1: String): SomeType! @localResolver(value: { field1: "{args.arg1}", field2: "baz", field3: "qux" })
        }
      `,
      query: gql`
        query {
          foo(arg1: "bar") {
            field1
            field2
            field3
          }
        }
      `,
      expected: { foo: { field1: 'bar', field2: 'baz', field3: 'qux' } },
      resolvers: {},
    },
  ],
  [
    'Enabled is true, strategy is replace',
    {
      typeDefs: gql`
        type Query {
          foo: String! @localResolver(value: "FOO", enabled: "{ true }")
        }
      `,
      query: gql`
        query {
          foo
        }
      `,
      expected: { foo: 'FOO' },
      resolvers: {
        Query: {
          foo: () => 'BAR',
        },
      },
    },
  ],
  [
    'Enabled is false, strategy is replace',
    {
      typeDefs: gql`
        type Query {
          foo: String! @localResolver(value: "FOO", enabled: "{ false }")
        }
      `,
      query: gql`
        query {
          foo
        }
      `,
      expected: { foo: 'BAR' },
      resolvers: {
        Query: {
          foo: () => 'BAR',
        },
      },
    },
  ],
  [
    'Enabled is true, strategy is merge',
    {
      typeDefs: gql`
        type Foo {
          bar: String
          baz: String
        }

        type Query {
          foo: Foo! @localResolver(value: { baz: "BAZ" }, enabled: "{ true }", mergeStrategy: Merge)
        }
      `,
      query: gql`
        query {
          foo {
            bar
            baz
          }
        }
      `,
      expected: { foo: { bar: 'BAR', baz: 'BAZ' } },
      resolvers: {
        Query: {
          foo: () => ({ bar: 'BAR' }),
        },
      },
    },
  ],
  [
    'Enabled is false, strategy is merge',
    {
      typeDefs: gql`
        type Foo {
          bar: String
          baz: String
        }

        type Query {
          foo: Foo! @localResolver(value: { baz: "BAZ" }, enabled: "{ false }", mergeStrategy: Merge)
        }
      `,
      query: gql`
        query {
          foo {
            bar
            baz
          }
        }
      `,
      expected: { foo: { bar: 'BAR', baz: null } },
      resolvers: {
        Query: {
          foo: () => ({ bar: 'BAR' }),
        },
      },
    },
  ],
];

const baseTypeDefs = gql`
  scalar JSON
  scalar JSONObject

  type SomeType {
    field1: String!
    field2: String!
    field3: String!
  }

  directive @keepStringVariable(var: String!) on FIELD
`;

const schemaDirectives: Record<string, typeof SchemaDirectiveVisitor> = {
  localResolver: LocalResolverDirective,
};

const baseResolvers: GraphQLResolverMap = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
};

describe.each(testCases)(
  'LocalResolver Directive',
  (
    testCase,
    {
      typeDefs,
      query = defaultQuery,
      variables,
      rootValue,
      expected = defaultExpected,
      resolvers = defaultResolvers,
      only = false,
    }
  ) => {
    let client: ApolloServerTestClient;
    let server: ApolloServerBase;

    beforeAll(() => {
      server = new ApolloServer({
        typeDefs: concatAST([typeDefs, baseTypeDefs, localResolverSdl]),
        schemaDirectives,
        resolvers: { ...baseResolvers, ...resolvers },
        rootValue,
      });
      client = createTestClient(server);
    });

    afterAll(async () => {
      await server.stop();
    });

    const testCommand = only ? test.only : test;

    testCommand(testCase, async () => {
      const response = await client.query({ query, variables });
      expect(response.data).toEqual(expected);
    });
  }
);
