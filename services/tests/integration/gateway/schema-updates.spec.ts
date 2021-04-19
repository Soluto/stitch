import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as nock from 'nock';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import createStitchGateway, { StitchGatewayService } from '../../../src/modules/apollo-server';
import { beforeEachDispose } from '../before-each-dispose';
import { ResourceGroup } from '../../../src/modules/resource-repository';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

const schema1 = {
  metadata: {
    namespace: 'namespace',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      version: String! @localResolver(value: "v1")
    }
  `),
};

const schema2 = {
  metadata: {
    namespace: 'namespace',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      version: String! @localResolver(value: "v2")
    }
  `),
};

const resourceGroup: ResourceGroup = {
  schemas: [],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [],
};

describe('Hello world', () => {
  let stitch: StitchGatewayService;
  let client: ApolloServerTestClient;

  const fetchLatestMock = jest.fn();
  (getResourceRepository as jest.Mock).mockImplementationOnce(
    jest.fn().mockReturnValueOnce({
      fetchLatest: fetchLatestMock,
    })
  );

  beforeEachDispose(async () => {
    fetchLatestMock.mockImplementation(() =>
      Promise.resolve({ resourceGroup: { ...resourceGroup, schemas: [schema1] }, isNew: true })
    );

    stitch = await createStitchGateway();
    client = createTestClient(stitch.server);

    return () => {
      jest.useRealTimers();
      nock.cleanAll();
      return stitch.server.stop();
    };
  });

  it('Returns different values after schema updates', async () => {
    const response1 = await client.query({
      query: gql`
        query {
          version
        }
      `,
    });

    expect(response1.errors).toBeUndefined();
    expect(response1.data).toEqual({ version: 'v1' });

    fetchLatestMock.mockImplementation(() =>
      Promise.resolve({ resourceGroup: { ...resourceGroup, schemas: [schema2] }, isNew: true })
    );
    await stitch.updateSchema();

    const response2 = await client.query({
      query: gql`
        query {
          version
        }
      `,
    });

    expect(response2.errors).toBeUndefined();
    expect(response2.data).toEqual({ version: 'v2' });
  });
});
