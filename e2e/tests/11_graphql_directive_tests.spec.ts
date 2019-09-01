import { expect } from "chai";
import { GraphQLClient } from "graphql-request";
import { getToken } from "../utils/token-utils";

// import * as customers from "../mocks/customer-api/data/customers.json";
import orders from "../mocks/order-api/data/orders.json";
import hotels from "../mocks/hotel-api/data/hotels.json";


describe("Graphql Directive tests", () => {

    const customerId = "1";

    let client: GraphQLClient;

    before(async () => {
        const token = await getToken();
        const options = {
            headers: {
                authorization: `Bearer ${token}`,
            }
        };
        client = new GraphQLClient(`${process.env.GRAPHQL_SERVER_URL}/graphql`, options);
    });

    it("should return hotels data", async () => {
        const expectedResponse = { hotels: hotels.map(h => h.name) };

        const response = await client.request(`{
            hotels {
                name
            }
        }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });

    it("should return hotel by id", async () => {
        const hotelId = "hotel_ibis_london_blackfriars";
        const expectedResponse = hotels.find(h => h.id === hotelId).name;

        const response = await client.request(`{
            hotel(id: ${hotelId}) {
                name
            }
        }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });

    it("should return hotel by id with orders", async () => {
        const hotelId = "hotel_ibis_london_blackfriars";
        const expectedResponse = {
            name: hotels.find(h => h.id === hotelId).name,
            orders: orders.filter(o => o.hotelId === hotelId).map(o => ({ startDate: o.startDate, endDate: o.endDate })),
        };

        const response = await client.request(`{
            hotel(id: ${hotelId}) {
                name
                orders {
                    startDate
                    endDate
                }
            }
        }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });
});