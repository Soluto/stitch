import { expect } from 'chai';
import { GraphQLClient } from 'graphql-request';
import { getToken } from '../utils/token-utils';

import customers from '../mocks/customer-api/data/customers.json';

describe('@rest directive tests', () => {
  let client: GraphQLClient;

  const customerId = '1';
  const expectedResponse = {
    customer: {
      id: customerId,
      ...customers[customerId]
    }
  };

  before(async () => {
    const token = await getToken();
    const options = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    client = new GraphQLClient(`${process.env.GRAPHQL_SERVER_URL}/graphql`, options);
  });

  it('should return customer data', async () => {
    const response = await client.request(`{
      customer(id: "1") {
          id
          lastName
          firstName
      }
    }`);

    expect(response).to.eql(expectedResponse);
  });
});
