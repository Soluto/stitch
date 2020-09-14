import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer, IResolvers } from 'apollo-server-fastify';
import { when } from 'jest-when';
import { concatAST, DocumentNode } from 'graphql';
import { policySdl, PolicyDirective, PolicyExecutor } from '../../../src/modules/directives/policy';
import { sdl as localResolverSdl, LocalResolverDirective } from '../../../src/modules/directives/local-resolver';
import { sdl as lowerCaseSdl, LowerCaseDirective } from '../utils/lower-case-directive';
import { sdl as mockSdl, MockDirective } from '../utils/mock-directive';
import { baseTypeDef, resolvers as baseResolvers } from '../../../src/modules/base-schema';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';

const mockValidatePolicy = jest.fn();
// eslint-disable-next-line unicorn/no-useless-undefined
when(mockValidatePolicy).calledWith({ namespace: 'ns', name: 'alwaysAllow' }).mockResolvedValue(undefined);
when(mockValidatePolicy).calledWith({ namespace: 'ns', name: 'alwaysDeny' }).mockRejectedValue(new Error('Error'));
// eslint-disable-next-line unicorn/no-useless-undefined
when(mockValidatePolicy).calledWith({ namespace: 'ns', name: 'alwaysAllow2' }).mockResolvedValue(undefined);
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
    'Policy on field, stub on parent query (ALLOW)',
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
    'Policy on field, stub on parent query (DENY)',
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
    'Policy, stub on field (ALLOW)',
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
    'Policy, stub on field (DENY)',
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
    'Policy on object, stub on field (ALLOW)',
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
    'Policy on object, stub on field (DENY)',
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
    'Policy on object, stub on parent query (ALLOW)',
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
    'Policy, stub on parent query (DENY)',
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
    'LowerCase on object, policy on field, stub on parent query (ALLOW)',
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
    'LowerCase on object, policy on field, stub on parent query (DENY)',
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
    'LowerCase, policy on object, stub on parent query (ALLOW)',
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
    'LowerCase, policy on object, stub on parent query (DENY)',
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
    'Policy, lowerCase on object, stub on parent query (ALLOW)',
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
    'Policy, lowerCase on object, stub on parent query (DENY)',
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
    'Mock, policy on object, stub on parent query (ALLOW)',
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
    'Mock, policy on object, stub on parent query (DENY)',
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
  [
    'Multiple policy on field, resolver on object (ALLOW and ALLOW = ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysAllow") @policy(namespace: "ns", name: "alwaysAllow2")
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
    'Multiple policy on field, resolver on object (ALLOW and DENY = DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysAllow") @policy(namespace: "ns", name: "alwaysDeny")
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
    'Multiple policy on field, resolver on object (DENY and ALLOW = DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policy(namespace: "ns", name: "alwaysDeny") @policy(namespace: "ns", name: "alwaysAllow")
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
    'Multiple policies on object, stub on parent query (ALLOW and ALLOW = ALLOW)',
    {
      typeDefs: gql`
        type Foo @mock @policy(namespace: "ns", name: "alwaysAllow") @policy(namespace: "ns", name: "alwaysAllow2") {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { id: "1" })
        }
      `,
    },
  ],
  [
    'Multiple policies on object, stub on parent query (ALLOW and DENY = DENY)',
    {
      typeDefs: gql`
        type Foo @mock @policy(namespace: "ns", name: "alwaysAllow") @policy(namespace: "ns", name: "alwaysDeny") {
          bar: String!
        }
        type Query {
          foo: Foo! @localResolver(value: { id: "1" })
        }
      `,
    },
  ],
  [
    'Multiple policies on object, stub on parent query (DENY and ALLOW = DENY)',
    {
      typeDefs: gql`
        type Foo @mock @policy(namespace: "ns", name: "alwaysDeny") @policy(namespace: "ns", name: "alwaysAllow") {
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
  let client: ApolloServerTestClient;
  let server: ApolloServerBase;

  const query = gql`
    query {
      foo {
        bar
      }
    }
  `;

  beforeAll(() => {
    server = new ApolloServer({
      typeDefs: concatAST([baseTypeDef, typeDefs, localResolverSdl, policySdl, lowerCaseSdl, mockSdl]),
      resolvers: [resolvers ?? {}, baseResolvers],
      schemaDirectives: {
        localResolver: LocalResolverDirective,
        policy: PolicyDirective,
        lowerCase: LowerCaseDirective,
        mock: MockDirective,
      },
      context: {
        authorizationConfig: {
          policyExecutor: new PolicyExecutor(),
        },
      },
    });
    client = createTestClient(server);

    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  test(testName, async () => {
    const response = await client.query({ query });
    expect(response).toMatchSnapshot();
  });
});
