import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as Rx from 'rxjs';
import * as nock from 'nock';
import { makeExecutableSchema } from 'graphql-tools';
import { gql } from 'apollo-server-core';
import { graphqlSync, GraphQLSchema, print } from 'graphql';
import { createStitchGateway } from '../../../modules/gateway';
import { beforeEachDispose } from '../beforeEachDispose';

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
      extraFieldThatsNotOnTheRemoteGql: String! @stub(value: "surprise!")
      bestFriend: Employee
    }

    type Query {
      employee(employeeId: ID!): Employee
        @gql(url: "http://test.gql/graphql", fieldName: "employee", arguments: { id: "{args.employeeId}" })
    }
  `),
};

const resourceGroup = {
  etag: 'etag',
  schemas: [schema],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [],
};

describe('GQL Directive', () => {
  let client: ApolloServerTestClient;

  beforeEachDispose(() => {
    mockGqlBackend('http://test.gql', remoteSchema);

    const stitch = createStitchGateway({ resourceGroups: Rx.of(resourceGroup) });
    client = createTestClient(stitch.server);

    return () => {
      nock.cleanAll();
      return stitch.dispose();
    };
  });

  it('Arguments are passed through with variables', async () => {
    const response = await client.query({
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
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({
      employee: {
        name: ethel.name,
        bestFriend: {
          age: miriam.age,
          employeeId: miriam.employeeId,
          extraFieldThatsNotOnTheRemoteGql: 'surprise!',
        },
      },
    });
  });
});

function mockGqlBackend(host: string, schema: GraphQLSchema) {
  nock(host)
    .persist()
    .post('/graphql')
    .reply(200, (_, body: any) =>
      graphqlSync({
        schema,
        source: body.query,
        variableValues: body.variables,
        operationName: body.operationName,
      })
    );
}
