import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as Rx from 'rxjs';
import * as nock from 'nock';
import { makeExecutableSchema } from 'graphql-tools';
import { gql } from 'apollo-server-core';
import { graphqlSync, GraphQLSchema, print } from 'graphql';
import { createStitchGateway } from '../../../src/modules/gateway';
import { beforeEachDispose } from '../before-each-dispose';
import { sleep } from '../../helpers/utility';
import { Schema, Upstream } from '../../../src/modules/resource-repository';

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
const remoteLogicalHost = 'https://my-service';

const schema: Schema = {
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

const upstream: Upstream = {
  metadata: {
    namespace: 'namespace',
    name: 'name',
  },
  host: new URL(remoteLogicalHost).host,
  origin: remoteHost,
};

const resourceGroup = {
  etag: 'etag',
  schemas: [schema],
  upstreams: [upstream],
  upstreamClientCredentials: [],
  policies: [],
};

interface TestCase {
  statusCode?: number;
  delay?: number;
  host?: string;
}

const testCases: [string, TestCase][] = [
  ['Success', {}],
  ['Error 401', { statusCode: 401 }],
  ['Error 500', { statusCode: 500 }],
  ['Timeout', { delay: 2000 }],
  ['Upstream Host', { host: remoteLogicalHost }],
];

describe.each(testCases)('GQL Directive', (testCaseName, { statusCode, delay, host }) => {
  let client: ApolloServerTestClient;

  beforeEachDispose(async () => {
    mockGqlBackend(host ?? remoteHost, remoteSchema, statusCode, delay);

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
    .persist()
    .post('/graphql', body => body.operationName === 'IntrospectionQuery')
    .reply(200, (_, body: any) =>
      graphqlSync({
        schema,
        source: body.query,
        variableValues: body.variables,
        operationName: body.operationName,
      })
    )
    .post('/graphql', body => body.operationName !== 'IntrospectionQuery')
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
