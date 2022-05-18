import * as nock from 'nock';
import { gql, ApolloServerBase } from 'apollo-server-core';
import { print } from 'graphql';
import createStitchGateway from '../../../src/modules/apollo-server';
import { beforeEachDispose } from '../before-each-dispose';

jest.mock('../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

const schema = {
  metadata: {
    namespace: 'namespace',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      date: Date! @localResolver(value: "1991-10-05")
      dateTime: DateTime! @localResolver(value: "2008-03-07T19:33:15.233Z")
      timestamp: DateTime! @localResolver(value: 1582114537)
      time: Time! @localResolver(value: "19:33:15.233Z")
      rawJson: JSON! @localResolver(value: { a: { nested: { structure: 123 } } })
      jsonArray: JSON! @localResolver(value: [1, 2, 3])
      jsonObject: JSONObject! @localResolver(value: { hello: "world" })
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

(getResourceRepository as jest.Mock).mockImplementation(
  jest.fn().mockReturnValue({
    fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
  })
);

describe('Custom scalars', () => {
  let server: ApolloServerBase;
  beforeEachDispose(async () => {
    ({ server } = await createStitchGateway());
    return () => {
      nock.cleanAll();
      return server.stop();
    };
  });

  it('DateTime/Date/Time scalars', async () => {
    const response = await server.executeOperation({
      query: gql`
        query {
          date
          dateTime
          timestamp
          time
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({
      date: '1991-10-05',
      dateTime: '2008-03-07T19:33:15.233Z',
      timestamp: '2020-02-19T12:15:37.000Z',
      time: '19:33:15.233Z',
    });
  });

  it('JSON/JSONObject scalars', async () => {
    const response = await server.executeOperation({
      query: gql`
        query {
          rawJson
          jsonArray
          jsonObject
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({
      rawJson: { a: { nested: { structure: 123 } } },
      jsonArray: [1, 2, 3],
      jsonObject: { hello: 'world' },
    });
  });
});
