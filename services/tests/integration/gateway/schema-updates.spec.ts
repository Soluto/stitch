import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import * as Rx from 'rxjs';
import * as nock from 'nock';
import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import { createStitchGateway } from '../../../src/modules/gateway';
import { beforeEachDispose } from '../before-each-dispose';
import { ResourceGroup } from '../../../src/modules/resource-repository';

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

const resourceGroups = new Rx.BehaviorSubject<ResourceGroup>({ ...resourceGroup, schemas: [schema1] });
jest.mock('../../../src/modules/resource-repository/stream', () => ({
  pollForUpdates: jest.fn(() => resourceGroups),
}));

describe('Hello world', () => {
  let client: ApolloServerTestClient;

  beforeEachDispose(() => {
    const stitch = createStitchGateway();
    client = createTestClient(stitch.server);

    return () => {
      jest.useRealTimers();
      nock.cleanAll();
      resourceGroups.complete();
      return stitch.dispose();
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

    resourceGroups.next({ ...resourceGroup, schemas: [schema2] });

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
