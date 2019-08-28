import { expect } from "chai";
import { GraphQLClient } from "graphql-request";
import { getToken } from "../utils/token-utils";

import * as customers from "../mocks/customer-api/data/customers.json";
import * as customerOrders from "../mocks/order-api/data/orders.json";


describe("@http directive tests", () => {
    let client: GraphQLClient;

    const customerId = "1";
    const expectedResponse = {
        customer: {
            id: customerId,
            ...customers[customerId],
            orders: customerOrders[customerId],
        }
    };

    before(async () => {
        const token = await getToken();
        const options = {
            headers: {
                authorization: `Bearer ${token}`,
            }
        };
        client = new GraphQLClient(`${process.env.GRAPHQL_SERVER_URL}/graphql`, options);
    });

    it("should return user data", async () => {
        const response = await client.request(`{
            customer(id: "1") {
                id
                lastName
                firstName
                orders {
                    id
                    startDate
                    endDate
                    country
                    city
                    hotel
                    adults
                    children
                }
            }
        }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });
});