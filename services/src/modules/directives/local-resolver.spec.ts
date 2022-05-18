import { makeExecutableSchema } from '@graphql-tools/schema';
import { IResolvers } from '@graphql-tools/utils';
import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { concatAST, DocumentNode } from 'graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { sdl as localResolverSdl, directiveSchemaTransformer } from './local-resolver';

interface TestCase {
  typeDefs: DocumentNode;
  query?: DocumentNode;
  rootValue?: unknown;
  variables?: Record<string, unknown>;
  expected?: unknown;
  resolvers?: IResolvers;
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
    'Source multiline',
    {
      typeDefs: gql`
        type Query {
          foo: SomeType!
            @localResolver(
              value: {
                field3: """
                {
                  source.bar
                }
                """
              }
              mergeStrategy: Merge
            )
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
    'MergeDeep - original resolver return non-object',
    {
      typeDefs: gql`
        type SomeType2 {
          field1: String!
          field2: String
        }

        type NestedType {
          nestedField: SomeType2!
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
            }
          }
        }
      `,
      expected: { foo: { nestedField: { field1: 'mergedDeep', field2: null } } },
      resolvers: {
        Query: {
          foo: () => 'Hey',
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
    'EnabledIf is true, strategy is replace',
    {
      typeDefs: gql`
        type Query {
          foo: String! @localResolver(value: "FOO", enabledIf: "{ true }")
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
    'EnabledIf is false, strategy is replace',
    {
      typeDefs: gql`
        type Query {
          foo: String! @localResolver(value: "FOO", enabledIf: "{ false }")
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
    'EnabledIf is true, strategy is merge',
    {
      typeDefs: gql`
        type Foo {
          bar: String
          baz: String
        }

        type Query {
          foo: Foo! @localResolver(value: { baz: "BAZ" }, enabledIf: "{ true }", mergeStrategy: Merge)
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
    'EnabledIf is false, strategy is merge',
    {
      typeDefs: gql`
        type Foo {
          bar: String
          baz: String
        }

        type Query {
          foo: Foo! @localResolver(value: { baz: "BAZ" }, enabledIf: "{ false }", mergeStrategy: Merge)
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
  [
    'EnabledIf condition throws',
    {
      typeDefs: gql`
        type Query {
          foo: String! @localResolver(value: "FOO", enabledIf: "{ something that throws }")
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
    'Object',
    {
      typeDefs: gql`
        type Query {
          foo: Foo! @localResolver(value: {})
        }

        type Foo @localResolver(value: { bar: "BAR" }) {
          bar: String!
        }
      `,
      query: gql`
        query {
          foo {
            bar
          }
        }
      `,
      expected: { foo: { bar: 'BAR' } },
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

const baseResolvers: IResolvers = {
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
    let server: ApolloServerBase;

    beforeAll(() => {
      const schema = directiveSchemaTransformer(
        makeExecutableSchema({
          typeDefs: concatAST([typeDefs, baseTypeDefs, localResolverSdl]),
          resolvers: { ...baseResolvers, ...resolvers },
        })
      );
      server = new ApolloServer({
        schema,
        rootValue,
      });
    });

    afterAll(async () => {
      await server.stop();
    });

    const testCommand = only ? test.only : test;

    testCommand(testCase, async () => {
      const { data, errors } = await server.executeOperation({ query, variables });
      expect(errors).toBeUndefined();
      expect(data).toEqual(expected);
    });
  }
);
