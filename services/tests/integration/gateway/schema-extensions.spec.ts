import { basename } from 'path';
import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import * as nock from 'nock';
import createStitchGateway from '../../../src/modules/apollo-server';
import { beforeEachDispose } from '../before-each-dispose';
import { Schema, ResourceGroup } from '../../../src/modules/resource-repository';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

const organizations = [{ name: 'EvilCorp' }, { name: 'GoodCorp' }];

const teams: { [name: string]: any } = {
  GoodCorp: [{ name: 'GoodTeam' }, { name: 'ReallyGoodTeam' }],
  EvilCorp: [{ name: 'EvilTeam' }, { name: 'ReallyEvilTeam' }],
};

const employees: { [name: string]: any } = {
  GoodTeam: [{ name: 'Michael' }],
  ReallyGoodTeam: [{ name: 'Eleanor' }],
  EvilTeam: [{ name: 'Aviv' }],
  ReallyEvilTeam: [{ name: 'Alex' }],
};

const organizationSchema: Schema = {
  metadata: {
    namespace: 'namespace',
    name: 'organization',
  },
  schema: print(gql`
    type Organization @key(fields: "name") {
      name: String!
    }

    type Query {
      organizations: [Organization!]! @rest(url: "http://test.api/organizations")
    }
  `),
};

const teamSchema: Schema = {
  metadata: {
    namespace: 'namespace',
    name: 'team',
  },
  schema: print(gql`
    type Team @key(fields: "name") {
      name: String!
    }

    extend type Organization @key(fields: "name") {
      name: String! @external
      teams: [Team!]! @rest(url: "http://test.api/teams/{source.name}")
    }
  `),
};

const employeeSchema: Schema = {
  metadata: {
    namespace: 'namespace',
    name: 'employee',
  },
  schema: print(gql`
    type Employee {
      name: String!
    }

    extend type Team @key(fields: "name") {
      name: String! @external
      employees: [Employee!]! @rest(url: "http://test.api/employees/{source.name}")
    }
  `),
};

const resourceGroup: ResourceGroup = {
  schemas: [organizationSchema, teamSchema, employeeSchema],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [],
};

(getResourceRepository as jest.Mock).mockImplementationOnce(
  jest.fn().mockReturnValueOnce({
    fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
  })
);

describe('Schema Extensions', () => {
  let client: ApolloServerTestClient;

  beforeEachDispose(async () => {
    mockRestBackend('http://test.api');

    const { server } = await createStitchGateway();
    client = createTestClient(server);

    return () => {
      nock.cleanAll();
      return server.stop();
    };
  });

  it('Queries work through schema extensions', async () => {
    const response = await client.query({
      query: gql`
        query {
          organizations {
            name
            teams {
              name
              employees {
                name
              }
            }
          }
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({
      organizations: organizations.map((org: any) => ({
        ...org,
        teams: teams[org.name].map((team: any) => ({
          ...team,
          employees: employees[team.name],
        })),
      })),
    });
  });
});

function mockRestBackend(host: string) {
  return nock(host)
    .persist()
    .get('/organizations')
    .reply(200, organizations)
    .get(/\/teams\/\w+/)
    .reply(200, url => teams[basename(url)])
    .get(/\/employees\/\w+/)
    .reply(200, url => employees[basename(url)]);
}
