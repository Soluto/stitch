import { expect } from 'chai';
import { GraphQLClient } from 'graphql-request';
import { getToken } from '../utils/token-utils';

describe('Simple tests', () => {
  let client: GraphQLClient;

  before(async () => {
    const token = await getToken();
    const options = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    client = new GraphQLClient(`${process.env.GRAPHQL_SERVER_URL}/graphql`, options);
  });

  it('should return user data', async () => {
    const response = await client.request(`{
            hello
        }`);
    expect(response).to.exist;
    expect(response).to.deep.equal({ hello: 'world' });
  });
});
