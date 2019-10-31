import {expect} from 'chai';
import {GraphQLClient} from 'graphql-request';
import {getToken} from '../utils/token-utils';

import customers from '../mocks/customer-api/data/customers.json';
import orders from '../mocks/order-api/data/orders.json';
import hotels from '../mocks/hotel-api/data/hotels.json';
import reviews from '../mocks/hotel-api/data/reviews.json';

describe('exportAs directive tests', () => {
    let client: GraphQLClient;

    before(async () => {
        const token = await getToken();
        const options = {
            headers: {
                authorization: `Bearer ${token}`,
            },
        };
        client = new GraphQLClient(`${process.env.GRAPHQL_SERVER_URL}/graphql`, options);
    });

    it('customerFirstName is properly read from the top level query using exports', async () => {
        const customerId = '1';
        const reviewsLimit = 2;

        const {firstName, lastName} = customers[customerId];
        const expectedResponse = {
            customer: {
                firstName,
                orders: orders
                    .filter(o => o.customerId === customerId)
                    .map(o => ({
                        id: o.id,
                        customerFirstName: firstName,
                    })),
            },
        };

        const response = await client.request(`{
            customer(id: "${customerId}") {
              firstName
              orders {
                  id
                  customerFirstName
              }
            }
          }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });
});
