import { expect } from 'chai';
import { GraphQLClient } from 'graphql-request';
import { getToken } from '../utils/token-utils';

import customers from '../mocks/customer-api/data/customers.json';
import orders from '../mocks/order-api/data/orders.json';
import hotels from '../mocks/hotel-api/data/hotels.json';
import reviews from '../mocks/hotel-api/data/reviews.json';

describe('Graphql Directive tests', () => {
    let client: GraphQLClient;

    before(async () => {
        const token = await getToken();
        const options = {
            headers: {
                authorization: `Bearer ${token}`
            }
        };
        client = new GraphQLClient(
            `${process.env.GRAPHQL_SERVER_URL}/graphql`,
            options
        );
    });

    it('should return hotels data', async () => {
        const expectedResponse = {
            hotels: hotels.map(h => ({ name: h.name }))
        };

        const response = await client.request(`{
            hotels {
                name
            }
        }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });

    it('should return hotel by id', async () => {
        const hotelId = 'hotel_ibis_london_blackfriars';
        const expectedResponse = {
            hotel: { name: hotels.find(h => h.id === hotelId).name }
        };

        const response = await client.request(`{
            hotel(id: "${hotelId}") {
                name
            }
        }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });

    it('should return hotel by id with alias', async () => {
        const hotelId = 'hotel_ibis_london_blackfriars';
        const hotelAlias = 'hotelAlias';
        const expectedResponse = {
            hotelAlias: { name: hotels.find(h => h.id === hotelId).name }
        };

        const response = await client.request(`{
            ${hotelAlias}: hotel(id: "${hotelId}") {
                name
            }
        }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });

    it('should return hotel by id with orders', async () => {
        const customerId = '1';
        const reviewsLimit = 2;

        const { firstName, lastName } = customers[customerId];
        const expectedResponse = {
            customer: {
                firstName,
                lastName,
                orders: orders
                    .filter(o => o.customerId === customerId)
                    .map(o => ({
                        startDate: o.startDate,
                        endDate: o.endDate,
                        hotel: {
                            name: hotels.find(h => h.id === o.hotelId).name,
                            reviews: reviews
                                .filter(r => r.hotelId === o.hotelId)
                                .slice(0, reviewsLimit)
                                .map(r => ({
                                    author: r.author,
                                    text: r.text
                                }))
                        }
                    }))
            }
        };

        const response = await client.request(`{
            customer(id: "${customerId}") {
              firstName
              lastName
              orders {
                startDate
                endDate
                hotel {
                    name
                    reviews(limit: ${reviewsLimit}) {
                        author
                        text
                    }
                }
              }
            }
          }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });

    it('should return hotel data for query with fragment and variables', async () => {
        const hotelId = 'hotel_ibis_london_blackfriars';
        const expectedResponse = {
            hotel: {
                name: hotels.find(h => h.id === hotelId).name,
                reviews: reviews
                    .filter(r => r.hotelId === hotelId)
                    .slice(0, 2)
                    .map(r => ({ text: r.text }))
            }
        };

        const response = await client.request(
            `
        query($limit: Int) {
            hotel(id: "${hotelId}") {
              name
              reviews(limit: $limit) {
                ...ReviewFragment
              }
            }
          }

          fragment ReviewFragment on Review {
            ...ReviewSecondFragment
          }

          fragment ReviewSecondFragment on Review {
            text
          }`,
            {
                limit: 2
            }
        );
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });

    it('should return hotels data for query with inline fragment', async () => {
        const expectedResponse = {
            hotels: hotels.map(({ name, address }) => ({ name, address }))
        };

        const response = await client.request(
            `
        query($limit: Int) {
            hotels {
              ... on Hotel {
                  address
                  name
              }
            }
          }`
        );
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });
});
