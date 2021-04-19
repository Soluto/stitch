import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as nock from 'nock';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import createStitchGateway from '../../../src/modules/apollo-server';
import { beforeEachDispose } from '../before-each-dispose';
import { ResourceGroup } from '../../../src/modules/resource-repository';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

const schema = {
  metadata: {
    namespace: 'namespace',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      hello: String! @localResolver(value: "world!")
    }
  `),
};

const resourceGroup: ResourceGroup & { etag: string } = {
  etag: 'etag',
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

describe('Hello world', () => {
  let client: ApolloServerTestClient;

  beforeEachDispose(async () => {
    const { server } = await createStitchGateway();
    client = createTestClient(server);

    return () => {
      nock.cleanAll();
      return server.stop();
    };
  });

  it('Returns basic hello world', async () => {
    const response = await client.query({
      query: gql`
        query {
          hello
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ hello: 'world!' });
  });
});
