import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as Rx from 'rxjs';
import * as nock from 'nock';
import { makeExecutableSchema } from 'graphql-tools';
import { gql } from 'apollo-server-core';
import { graphqlSync, GraphQLSchema, print, printSchema } from 'graphql';
import { createStitchGateway } from '../../../src/modules/gateway';
import { beforeEachDispose } from '../before-each-dispose';
import { sleep } from '../../helpers/utility';
import { RemoteSchema } from '../../../src/modules/directives/gql';

const miriam = {
  employeeId: '1',
  name: 'miriam',
  age: 97,
};
const ethel = {
  employeeId: '2',
  name: 'ethel',
  age: 94,
  bestFriend: miriam,
};
const employees: { [id: string]: any } = {
  '1': miriam,
  '2': ethel,
};

const remoteSchema = makeExecutableSchema({
  typeDefs: gql`
    type Employee {
      employeeId: ID!
      name: String!
      age: Int!
      bestFriend: Employee
    }

    type Query {
      employee(id: ID!): Employee
    }
  `,
  resolvers: {
    Query: {
      employee: (_, { id }: { id: string }) => employees[id],
    },
  },
});

const remoteHost = 'http://localhost:1111';

const schema = {
  metadata: {
    namespace: 'namespace',
    name: 'name',
  },
  schema: print(gql`
    type Employee {
      employeeId: ID!
      name: String!
      age: Int!
      extraFieldThatsNotOnTheRemoteGql: String! @localResolver(value: "surprise!")
      bestFriend: Employee
    }

    type Query {
      employee(employeeId: ID!): Employee
        @gql(
          url: "${remoteHost}/graphql"
          fieldName: "employee"
          arguments: { id: "{args.employeeId}" }
          timeoutMs: 100
        )
    }
  `),
};

const remoteSchemaResource: RemoteSchema = {
  url: `${remoteHost}/graphql`,
  schema: printSchema(remoteSchema),
};

const resourceGroup = {
  etag: 'etag',
  schemas: [schema],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [],
  remoteSchemas: [remoteSchemaResource],
};

interface TestCase {
  statusCode?: number;
  delay?: number;
}

const testCases: [string, TestCase][] = [
  ['Success', {}],
  ['Error 401', { statusCode: 401 }],
  ['Error 500', { statusCode: 500 }],
  ['Timeout', { delay: 2000 }],
];

describe.each(testCases)('GQL Directive', (testCaseName, { statusCode, delay }) => {
  let client: ApolloServerTestClient;

  beforeEachDispose(async () => {
    mockGqlBackend(remoteHost, remoteSchema, statusCode, delay);

    const stitch = createStitchGateway({
      resourceGroups: Rx.of(resourceGroup),
      fastifyInstance: { metrics: undefined as any },
    });
    client = createTestClient(stitch.server);

    // Wait for introspection queries
    await sleep(300);

    return () => {
      nock.cleanAll();
      return stitch.dispose();
    };
  });

  it(`Remote GraphQL server call - ${testCaseName}`, async () => {
    const response = await client
      .query({
        query: gql`
          query EmpById($id: ID!) {
            employee(employeeId: $id) {
              name
              bestFriend {
                extraFieldThatsNotOnTheRemoteGql
                employeeId
                age
              }
            }
          }
        `,
        variables: { id: 2 },
      })
      .catch(e => e.response);

    expect(response).toMatchSnapshot();
  });
});

function mockGqlBackend(host: string, schema: GraphQLSchema, statusCode = 200, delay = 0) {
  nock(host)
    .post('/graphql')
    .delay(delay)
    .reply(statusCode, (_, body: any) =>
      graphqlSync({
        schema,
        source: body.query,
        variableValues: body.variables,
        operationName: body.operationName,
      })
    );
}
