import { expect } from 'chai';
import gqlRawFetch from '../utils/raw-graphql-request';
import { getToken } from '../utils/token-utils';

type GraphqlResponseBody = {
    data: any,
    errors: Array<{
        message: string,
        locations: Array<{
            line: number,
            column: number,
        }>,
    }>,
};

describe('Response statuses tests', () => {
  let token;

  const host = process.env.GRAPHQL_SERVER_URL;

  const gqlRequest = `{
        user(id: "1") {
            lastName
            firstName
        }
    }`;

  const badGqlRequest = `{
        user(id: "1") {
            Bad Request
    }`;

  before(async () => {
    token = await getToken();
  });

  it('should return 200 for valid request', async () => {
    const response = await gqlRawFetch(host, gqlRequest, token);
    expect(response).to.have.property('status', 200);
  });

  it('should return 401 for unauthenticated request', async () => {
    const response = await gqlRawFetch(host, gqlRequest);
    expect(response).to.have.property('status', 401);
  });

  it('should return 200 and errors array in result for invalid request', async () => {
    const response = await gqlRawFetch(host, badGqlRequest, token);
    expect(response).to.have.property('status', 200);
    const body: GraphqlResponseBody = await response.json();
    expect(body).to.have.property('errors');
    expect(body.errors).to.have.lengthOf.above(0);
    expect(body.errors[0].message).contains('Bad Request');
  });
});
