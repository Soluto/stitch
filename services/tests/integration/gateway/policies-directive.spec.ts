/* eslint-disable unicorn/no-useless-undefined */
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { when } from 'jest-when';
import { concatAST, DocumentNode } from 'graphql';
import { PolicyExecutor, UnauthorizedByPolicyError } from '../../../src/modules/directives/policy';
import { sdl as lowerCaseSdl, LowerCaseDirective } from '../utils/lower-case-directive';
import { sdl as mockSdl, MockDirective } from '../utils/mock-directive';
import getBaseSchema from '../../../src/modules/base-schema';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';

const mockValidatePolicy = jest.fn();
when(mockValidatePolicy).calledWith({ namespace: 'ns', name: 'alwaysAllow' }).mockResolvedValue(undefined);
when(mockValidatePolicy).calledWith({ namespace: 'ns', name: 'alwaysAllow2' }).mockResolvedValue(undefined);
when(mockValidatePolicy)
  .calledWith({ namespace: 'ns', name: 'allowWithArgs', args: { a: 'b' } })
  .mockResolvedValue(undefined);
when(mockValidatePolicy)
  .calledWith({ namespace: 'ns', name: 'alwaysDeny' })
  .mockRejectedValue(new UnauthorizedByPolicyError({ namespace: 'ns', name: 'alwaysDeny' }));
jest.mock('../../../src/modules/directives/policy/policy-executor', () => ({
  default: jest.fn().mockImplementation(() => ({ validatePolicy: mockValidatePolicy })),
}));

interface TestCase {
  typeDefs: DocumentNode;
}

const testCases: [string, TestCase][] = [
  [
    'Single policy (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policies(policies: [{ namespace: "ns", name: "alwaysAllow" }])
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
  [
    'Single policy (DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policies(policies: [{ namespace: "ns", name: "alwaysDeny" }])
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
  [
    '2 Allow policies with AND (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String!
            @policies(
              policies: [{ namespace: "ns", name: "alwaysAllow" }, { namespace: "ns", name: "alwaysAllow2" }]
              relation: AND
            )
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
  [
    '2 Allow policies with OR (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String!
            @policies(
              policies: [{ namespace: "ns", name: "alwaysAllow" }, { namespace: "ns", name: "alwaysAllow2" }]
              relation: OR
            )
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
  [
    'Allow and deny policies with AND (DENY)',
    {
      typeDefs: gql`
        type Foo {
          bar: String!
            @policies(
              policies: [{ namespace: "ns", name: "alwaysAllow" }, { namespace: "ns", name: "alwaysDeny" }]
              relation: AND
            )
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
  [
    'Allow and deny policies with OR (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String!
            @policies(
              policies: [{ namespace: "ns", name: "alwaysAllow" }, { namespace: "ns", name: "alwaysDeny" }]
              relation: OR
            )
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
  [
    'Policy with args (ALLOW)',
    {
      typeDefs: gql`
        type Foo {
          bar: String! @policies(policies: [{ namespace: "ns", name: "allowWithArgs", args: { a: "b" } }], relation: OR)
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
];

describe.each(testCases)('Policies Directive Tests', (testName, { typeDefs }) => {
  let client: ApolloServerTestClient;
  let server: ApolloServerBase;

  const query = gql`
    query {
      foo {
        bar
      }
    }
  `;

  const resolvers = {
    Query: {
      foo: () => ({ bar: 'BAR' }),
    },
  };

  beforeAll(async () => {
    const baseSchema = await getBaseSchema();
    server = new ApolloServer({
      typeDefs: concatAST([baseSchema.typeDefs, typeDefs, lowerCaseSdl, mockSdl]),
      resolvers: [resolvers ?? {}, baseSchema.resolvers],
      schemaDirectives: {
        ...baseSchema.directives,
        lowerCase: LowerCaseDirective,
        mock: MockDirective,
      },
      context: {
        policyExecutor: new PolicyExecutor(),
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
