import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server-core';
import { app } from '../../../src/registry';

describe('Test connection', () => {
  let client: ApolloServerTestClient;

  beforeEach(() => {
    client = createTestClient(app);
  });

  test('returns success', async () => {
    const query = gql`
      query {
        testConnection
      }
    `;
    const { data, errors } = await client.query({ query });
    expect(errors).toBeUndefined();
    expect(data?.testConnection).toEqual('success');
  });
});
