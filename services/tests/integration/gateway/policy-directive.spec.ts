import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { when } from 'jest-when';
import { concatAST, DocumentNode } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PolicyExecutor } from '../../../src/modules/directives/policy';
import {
  sdl as lowerCaseSdl,
  directiveSchemaTransformer as lowerCaseDirectiveSchemaTransformer,
} from '../utils/lower-case-directive';
import { sdl as mockSdl, directiveSchemaTransformer as mockDirectiveSchemaTransformer } from '../utils/mock-directive';
import getBaseSchema from '../../../src/modules/base-schema';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';

const mockValidatePolicy = jest.fn();
when(mockValidatePolicy)
  .calledWith({ namespace: 'ns', name: 'alwaysAllow', postResolve: false })
  // eslint-disable-next-line unicorn/no-useless-undefined
  .mockResolvedValue(undefined)
  .calledWith({ namespace: 'ns', name: 'alwaysDeny', postResolve: false })
  .mockRejectedValue(new Error('Error'));
jest.mock('../../../src/modules/directives/policy/policy-executor', () => ({
  default: jest.fn().mockImplementation(() => ({ validatePolicy: mockValidatePolicy })),
}));

interface TestCase {
  typeDefs: DocumentNode;
  resolvers?: IResolvers;
}

const testCases: [string, TestCase][] = [
  [
    'Policy on field, resolver on object (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysAllow")
        }
        type Query {
          foo: Foo!
        }
      `,
      resolvers: {
        Query: {
          foo: () => ({ bar: 'BAR' }),
        },
      },
    },
  ],
  [
    'Policy on field, resolver on object (DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysDeny")
        }
        type Query {
          foo: Foo!
        }
      `,
      resolvers: {
        Query: {
          foo: () => ({ bar: 'BAR' }),
        },
      },
    },
  ],
  [
    'Policy on field, localResolver on parent query (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysAllow")
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    'Policy on field, localResolver on parent query (DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysDeny")
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    'Stub, policy on field (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @localResolver(value: "BAR") @policy(namespace: "ns", name: "alwaysAllow")
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    'Stub, policy on field (DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @localResolver(value: "BAR") @policy(namespace: "ns", name: "alwaysDeny")
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    // This is incorrect order of directives so the policy doesn't work
    'Policy, localResolver on field (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysAllow") @localResolver(value: "BAR")
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    // This is incorrect order of directives so the policy doesn't work
    'Policy, localResolver on field (DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysDeny") @localResolver(value: "BAR")
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    'Policy on object, localResolver on field (ALLOW)',
    {
      typeDefs: gql`
        type Foo @policy(namespace: "ns", name: "alwaysAllow") {
          bar: String! @localResolver(value: "BAR")
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    'Policy on object, localResolver on field (DENY)',
    {
      typeDefs: gql`
        type Foo @policy(namespace: "ns", name: "alwaysDeny") {
          bar: String! @localResolver(value: "BAR")
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    'Policy on object, localResolver on parent query (ALLOW)',
    {
      typeDefs: gql`
        type Foo @policy(namespace: "ns", name: "alwaysAllow") {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    'Policy, localResolver on parent query (DENY)',
    {
      typeDefs: gql`
        type Foo @policy(namespace: "ns", name: "alwaysDeny") {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    'Stub, lowerCase, policy on field (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @localResolver(value: "BAR") @lowerCase @policy(namespace: "ns", name: "alwaysAllow")
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    'Stub, lowerCase, policy on field (DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @localResolver(value: "BAR") @lowerCase @policy(namespace: "ns", name: "alwaysDeny")
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    'Stub, policy, lowerCase on field (ALLOW)',
    {
      // This is incorrect order of directives but it still does work by chance.
      typeDefs: gql`
        type Foo {
          bar: String! @localResolver(value: "BAR") @policy(namespace: "ns", name: "alwaysAllow") @lowerCase
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    // This is incorrect order of directives but it still does work by chance.
    'Stub, policy, lowerCase on field (DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @localResolver(value: "BAR") @policy(namespace: "ns", name: "alwaysDeny") @lowerCase
        }
        type Query {
          foo: Foo! @localResolver(value: {})
        }
      `,
    },
  ],
  [
    'LowerCase on object, policy on field, localResolver on parent query (ALLOW)',
    {
      typeDefs: gql`
        type Foo @lowerCase {
          bar: String! @policy(namespace: "ns", name: "alwaysAllow")
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    'LowerCase on object, policy on field, localResolver on parent query (DENY)',
    {
      typeDefs: gql`
        type Foo @lowerCase {
          bar: String! @policy(namespace: "ns", name: "alwaysDeny")
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    'LowerCase, policy on object, localResolver on parent query (ALLOW)',
    {
      typeDefs: gql`
        type Foo @lowerCase @policy(namespace: "ns", name: "alwaysAllow") {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    'LowerCase, policy on object, localResolver on parent query (DENY)',
    {
      typeDefs: gql`
        type Foo @lowerCase @policy(namespace: "ns", name: "alwaysDeny") {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    // This is incorrect order of directives so the policy doesn't work
    'Policy, lowerCase on object, localResolver on parent query (ALLOW)',
    {
      typeDefs: gql`
        type Foo @policy(namespace: "ns", name: "alwaysAllow") @lowerCase {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    // This is incorrect order of directives so the policy doesn't work
    'Policy, lowerCase on object, localResolver on parent query (DENY)',
    {
      typeDefs: gql`
        type Foo @policy(namespace: "ns", name: "alwaysDeny") @lowerCase {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { bar: "BAR" })
        }
      `,
    },
  ],
  [
    'Mock, policy on object, localResolver on parent query (ALLOW)',
    {
      typeDefs: gql`
        type Foo @mock @policy(namespace: "ns", name: "alwaysAllow") {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { id: "1" })
        }
      `,
    },
  ],
  [
    'Mock, policy on object, localResolver on parent query (DENY)',
    {
      typeDefs: gql`
        type Foo @mock @policy(namespace: "ns", name: "alwaysDeny") {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { id: "1" })
        }
      `,
    },
  ],
];

describe.each(testCases)('Policy Directive Tests', (testName, { typeDefs, resolvers }) => {
  let server: ApolloServerBase;

  const query = gql`
    query {
      foo {
        bar
      }
    }
  `;

  beforeAll(async () => {
    const baseSchema = await getBaseSchema();
    let schema = makeExecutableSchema({
      typeDefs: concatAST([baseSchema.typeDefs, typeDefs, lowerCaseSdl, mockSdl]),
      resolvers: [resolvers ?? {}, baseSchema.resolvers],
    });
    for (const directiveSchemaTransformer of Object.values([
      ...Object.values(baseSchema.directives),
      mockDirectiveSchemaTransformer,
      lowerCaseDirectiveSchemaTransformer,
    ])) {
      schema = directiveSchemaTransformer(schema);
    }

    server = new ApolloServer({
      schema,
      context: {
        policyExecutor: new PolicyExecutor(),
      },
    });
    await server.start();

    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  afterAll(async () => {
    await server.stop();
  });

  test(testName, async () => {
    const response = await server.executeOperation({ query });
    expect(response).toMatchSnapshot();
  });
});
