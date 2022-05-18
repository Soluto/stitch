import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { when } from 'jest-when';
import { concatAST, DocumentNode } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PolicyExecutor, UnauthorizedByPolicyError } from '../../../src/modules/directives/policy';
import {
  sdl as lowerCaseSdl,
  directiveSchemaTransformer as lowerCaseDirectiveSchemaTransformer,
} from '../utils/lower-case-directive';
import { sdl as mockSdl, directiveSchemaTransformer as mockDirectiveSchemaTransformer } from '../utils/mock-directive';
import getBaseSchema from '../../../src/modules/base-schema';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import PolicyExecutionFailedError from '../../../src/modules/directives/policy/policy-execution-failed-error';
import { ResourceMetadata } from '../../../src/modules/resource-repository';

const unauthorizedPolicy: ResourceMetadata = { namespace: 'ns', name: 'alwaysDeny' };
const failedPolicy: ResourceMetadata = { namespace: 'ns', name: 'alwaysFail' };

const mockValidatePolicy = jest.fn();
when(mockValidatePolicy)
  .calledWith({ namespace: 'ns', name: 'alwaysAllow' })
  .mockResolvedValue(undefined)
  .calledWith({ namespace: 'ns', name: 'alwaysAllow2' })
  .mockResolvedValue(undefined)
  .calledWith({ namespace: 'ns', name: 'allowWithArgs', args: { a: 'b' } })
  .mockResolvedValue(undefined)
  .calledWith(unauthorizedPolicy)
  .mockRejectedValue(new UnauthorizedByPolicyError(unauthorizedPolicy, 'Foo', 'bar'))
  .calledWith(failedPolicy)
  .mockRejectedValue(new PolicyExecutionFailedError(failedPolicy, 'Not good', 'Foo', 'bar'));
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
          bar: String @policies(policies: [{ namespace: "ns", name: "alwaysAllow" }])
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
          bar: String @policies(policies: [{ namespace: "ns", name: "alwaysDeny" }])
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
          bar: String
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
          bar: String
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
          bar: String
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
          bar: String
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
          bar: String @policies(policies: [{ namespace: "ns", name: "allowWithArgs", args: { a: "b" } }], relation: OR)
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
  [
    'Policy fails',
    {
      typeDefs: gql`
        type Foo {
          bar: String @policies(policies: [{ namespace: "ns", name: "alwaysFail" }])
        }
        type Query {
          foo: Foo!
        }
      `,
    },
  ],
];

describe.each(testCases)('Policies Directive Tests', (testName, { typeDefs }) => {
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

  test(testName, async () => {
    const response = await server.executeOperation({ query });
    expect(response).toMatchSnapshot();
  });
});
