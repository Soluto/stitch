import { ApolloError, ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { concatAST, DocumentNode } from 'graphql';
import { IResolvers, SchemaDirectiveVisitor } from 'graphql-tools';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import GraphQLErrorSerializer from '../../../tests/utils/graphql-error-serializer';
import { sdl as errorHandlerSdl, ErrorHandlerDirective } from './error-handler';

interface TestCase {
  directiveArgsFieldDefinition: string;
  directiveArgsObjectDefinition: string;
  query?: DocumentNode;
  variables?: Record<string, unknown>;
  resolvers?: IResolvers;
  only?: boolean;
}

const defaultResolvers: IResolvers = {
  Query: {
    foo: () => 'Foo',
    bar: () => ({ baz: 'Baz' }),
    bar2: () => ({}),
  },
};

const defaultThrowingResolvers: IResolvers = {
  Query: {
    foo: () => {
      throw new ApolloError('Foo field resolver throws');
    },
    bar: () => ({}),
  },
  Bar: {
    __resolveObject: () => {
      throw new ApolloError('Bar object resolver throws');
    },
  },
  Bar2: {
    __resolveObject: () => {
      throw new ApolloError('Bar2 object resolver throws');
    },
  },
};
const createTypeDefs = (directiveArgsFieldDefinition: string, directiveArgsObjectDefinition: string) => gql`
  type Query {
    foo: String @errorHandler${directiveArgsFieldDefinition}
    bar: Bar
    bar2: Bar2
  }

  type Bar @errorHandler${directiveArgsObjectDefinition} {
    baz: String!
  }

  type Bar2 @errorHandler${directiveArgsObjectDefinition} {
    baz: String
  }
`;

const testCases: [string, TestCase][] = [
  [
    '1) Original resolver DOES NOT throw, no catchError, no throwError',
    {
      directiveArgsFieldDefinition: '',
      directiveArgsObjectDefinition: '',
      resolvers: defaultResolvers,
    },
  ],
  [
    '2) Original resolver DOES throw, no catchError, no throwError',
    {
      directiveArgsFieldDefinition: '',
      directiveArgsObjectDefinition: '',
    },
  ],
  [
    '3) Original resolver DOES throw, catchError condition and returnValue are undefined, no throwError',
    {
      directiveArgsFieldDefinition: '(catchError: {})',
      directiveArgsObjectDefinition: '(catchError: {})',
      resolvers: defaultThrowingResolvers,
    },
  ],
  [
    '4) Original resolver DOES throw, catchError condition is undefined, no throwError',
    {
      directiveArgsFieldDefinition: '(catchError: { returnValue: "Foo (Caught)" })',
      directiveArgsObjectDefinition: '(catchError: { returnValue: { baz: "Baz (Caught)" } })',
    },
  ],
  [
    '5) Original resolver DOES throw, catchError condition is undefined, returnValue is argument injection, no throwError',
    {
      directiveArgsFieldDefinition: `(catchError: { returnValue: "{ 'Foo (Caught)' }" })`,
      directiveArgsObjectDefinition: `(catchError: { returnValue: "{{ baz: 'Baz (Caught)' }}" })`,
    },
  ],
  [
    '6) Original resolver DOES throw, catchError condition is false, no throwError',
    {
      directiveArgsFieldDefinition: `(catchError: { condition: "{ error.message === 'Catch me' }", returnValue: "Foo (Caught)" })`,
      directiveArgsObjectDefinition: `(
        catchError: { condition: "{ error.message === 'Catch me' }", returnValue: { baz: "Baz (Caught)" } }
      )`,
    },
  ],
  [
    '7) Original resolver DOES throw, catchError condition is invalid, no throwError',
    {
      directiveArgsFieldDefinition: `(catchError: { condition: "{ hey }", returnValue: "Foo (Caught)" })`,
      directiveArgsObjectDefinition: `(
        catchError: { condition: "{ hey }", returnValue: { baz: "Baz (Caught)" } }
      )`,
    },
  ],
  [
    '8) Original resolver DOES throw, catchError condition is true, no throwError',
    {
      directiveArgsFieldDefinition: `(catchError: { condition: "{ error.message.includes('resolver throws') }", returnValue: "Foo (Caught)" })`,
      directiveArgsObjectDefinition: `(
        catchError: { condition: "{ error.message.includes('resolver throws') }", returnValue: { baz: "Baz (Caught)" } }
      )`,
    },
  ],
  [
    '9) Original resolver DOES NOT throw, no catchError, throwError condition and error are undefined',
    {
      directiveArgsFieldDefinition: `(throwError: {})`,
      directiveArgsObjectDefinition: `(throwError: {})`,
      resolvers: defaultResolvers,
    },
  ],
  [
    '10) Original resolver DOES NOT throw, no catchError, throwError condition is undefined',
    {
      directiveArgsFieldDefinition: `(throwError: { errorToThrow: "{ new Error('Throw me') }" })`,
      directiveArgsObjectDefinition: `(throwError: { errorToThrow: "{ new Error('Throw me') }" })`,
      resolvers: defaultResolvers,
    },
  ],
  [
    '11) Original resolver DOES NOT throw, no catchError, throwError condition is undefined, errorToThrow evaluation is string',
    {
      directiveArgsFieldDefinition: `(throwError: { errorToThrow: "{ 'Throw me' }" })`,
      directiveArgsObjectDefinition: `(throwError: { errorToThrow: "{ 'Throw me' }" })`,
      resolvers: defaultResolvers,
    },
  ],
  [
    '12) Original resolver DOES NOT throw, no catchError, throwError condition is undefined, errorToThrow is string',
    {
      directiveArgsFieldDefinition: `(throwError: { errorToThrow: "Throw me" })`,
      directiveArgsObjectDefinition: `(throwError: { errorToThrow: "Throw me" })`,
      resolvers: defaultResolvers,
    },
  ],
  [
    '13) Original resolver DOES NOT throw, no catchError, throwError condition is undefined, errorToThrow is invalid',
    {
      directiveArgsFieldDefinition: `(throwError: { errorToThrow: "{ Throw me }" })`,
      directiveArgsObjectDefinition: `(throwError: { errorToThrow: "{ Throw me }" })`,
      resolvers: defaultResolvers,
    },
  ],
  [
    '14) Original resolver DOES NOT throw, no catchError, throwError condition is false',
    {
      directiveArgsFieldDefinition: `(throwError: { condition: "{ false }" })`,
      directiveArgsObjectDefinition: `(throwError: { condition: "{ false }" })`,
      resolvers: defaultResolvers,
    },
  ],
  [
    '15) Original resolver DOES NOT throw, no catchError, throwError condition is invalid',
    {
      directiveArgsFieldDefinition: `(throwError: { condition: "{ yes }" })`,
      directiveArgsObjectDefinition: `(throwError: { condition: "{ yes }" })`,
      resolvers: defaultResolvers,
    },
  ],
  [
    '16) Original resolver DOES NOT throw, no catchError, throwError condition is true',
    {
      directiveArgsFieldDefinition: `(throwError: { condition: "{ result === 'Foo' }", errorToThrow: "Something is wrong" })`,
      directiveArgsObjectDefinition: `(throwError: { condition: "{ result?.baz === 'Baz' }", errorToThrow: "Something is wrong" })`,
      resolvers: defaultResolvers,
    },
  ],
  [
    '17) Original resolver DOES throw, catchError condition is false, throwError defined',
    {
      directiveArgsFieldDefinition: `(
        catchError: { condition: "{ false }" }
        throwError: { condition: "{ result === 'Foo' }", errorToThrow: "Something is wrong" }
      )`,
      directiveArgsObjectDefinition: `(
        catchError: { condition: "{ false }" }
        throwError: { condition: "{ result?.baz === 'Baz' }", errorToThrow: "Something is wrong" }
      )`,
    },
  ],
  [
    '18) Original resolver DOES throw, catchError condition is true, throwError defined',
    {
      directiveArgsFieldDefinition: `(
        catchError: { condition: "{ error.message.includes('resolver throws') }", returnValue: "Foo (Caught)" }
        throwError: { condition: "{ result?.includes('Caught') }", errorToThrow: "Something is wrong" }
      )`,
      directiveArgsObjectDefinition: `(
        catchError: { condition: "{ error.message.includes('resolver throws') }", returnValue: { baz: "Baz (Caught)" } }
        throwError: { condition: "{ result?.baz?.includes('Caught') }", errorToThrow: "Something is wrong" }
      )`,
    },
  ],
];

const defaultQuery = gql`
  query {
    foo
    bar {
      baz
    }
    bar2 {
      baz
    }
  }
`;

const baseTypeDefs = gql`
  scalar JSON
  scalar JSONObject
`;

const schemaDirectives: Record<string, typeof SchemaDirectiveVisitor> = {
  errorHandler: ErrorHandlerDirective,
};

const baseResolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
};

describe.each(testCases)(
  '@errorHandler directive',
  (
    testCase,
    {
      directiveArgsFieldDefinition,
      directiveArgsObjectDefinition,
      query = defaultQuery,
      variables,
      resolvers = defaultThrowingResolvers,
      only = false,
    }
  ) => {
    let client: ApolloServerTestClient;
    let server: ApolloServerBase;

    beforeAll(() => {
      expect.addSnapshotSerializer(GraphQLErrorSerializer);
      const typeDefs = createTypeDefs(directiveArgsFieldDefinition, directiveArgsObjectDefinition);
      server = new ApolloServer({
        typeDefs: concatAST([typeDefs, baseTypeDefs, errorHandlerSdl]),
        schemaDirectives,
        resolvers: { ...baseResolvers, ...resolvers },
      });
      client = createTestClient(server);
    });

    afterAll(async () => {
      await server.stop();
    });

    const testCommand = only ? test.only : test;

    testCommand(testCase, async () => {
      const { data, errors } = await client.query({ query, variables });
      expect({ data, errors }).toMatchSnapshot();
    });
  }
);
