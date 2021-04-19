import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import * as nock from 'nock';
import createStitchGateway from '../../../src/modules/apollo-server';
import { beforeEachDispose } from '../before-each-dispose';
import { Schema, ResourceGroup } from '../../../src/modules/resource-repository';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

const organizations = [
  {
    name: 'EvilCorp',
    teams: [
      {
        name: 'Evil Team',
        employees: [{ name: 'Aviv' }],
      },

      {
        name: 'Really Evil Team',
        employees: [{ name: 'Alex' }],
      },
    ],
  },
  {
    name: 'GoodCorp',
    teams: [
      {
        name: 'Good Team',
        employees: [{ name: 'Michael' }],
      },

      {
        name: 'Really Good Team',
        employees: [{ name: 'Eleanor' }],
      },
    ],
  },
];

const schema: Schema = {
  metadata: {
    namespace: 'namespace',
    name: 'name',
  },
  schema: print(gql`
    type Employee {
      name: String!
      organizationName: ID! @localResolver(value: "{exports.organizationName}")
    }

    type Team {
      name: String!
      employees: [Employee!]!
    }

    type Organization {
      name: String! @export(key: "organizationName")
      teams: [Team!]!
    }

    type Query {
      organizations: [Organization!]! @rest(url: "http://test.api/organizations")
    }
  `),
};

const resourceGroup: ResourceGroup = {
  schemas: [schema],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [],
};

(getResourceRepository as jest.Mock).mockImplementationOnce(
  jest.fn().mockReturnValueOnce({
    fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
  })
);

describe('Export Directive', () => {
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

  it('Resolvers have access to exports from grandparent level', async () => {
    const response = await client.query({
      query: gql`
        query {
          organizations {
            teams {
              employees {
                name
                organizationName
              }
            }
          }
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    const orgNames = response.data!.organizations.flatMap((org: any) =>
      org.teams.flatMap((team: any) => team.employees.map((emp: any) => emp.organizationName))
    );
    expect(orgNames).toEqual(['EvilCorp', 'EvilCorp', 'GoodCorp', 'GoodCorp']);
  });
});

function mockRestBackend(host: string) {
  return nock(host).get('/organizations').reply(200, organizations);
}
