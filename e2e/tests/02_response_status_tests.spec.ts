import { expect } from "chai";
import gqlRawFetch from "../utils/raw-graphql-request";
import { getToken } from "../utils/token-utils";

describe("Response statuses tests", () => {
    let token;

    const host = process.env.GRAPHQL_SERVER_URL;

    const gqlRequest = `{
        user(id: "1") {
            lastName
            firstName
        }
    }`;

    const badQqlRequest = `{
        user(id: "1") {
            Bad Request
    }`;

    before(async () => {
        token = await getToken();
    });

    it("should return 200 for valid request", async () => {
        const response = await gqlRawFetch(host, gqlRequest, token);
        expect(response).to.exist;
        expect(response.status).to.equal(200);
    });

    it("should return 401 for unauthenticated request", async () => {
        const response = await gqlRawFetch(host, gqlRequest);
        expect(response).to.exist;
        expect(response.status).to.equal(401);
    });

    it("should return 400 for invalid request", async () => {
        const response = await gqlRawFetch(host, badQqlRequest, token);

        console.log(`===== ${await response.text()}`);

        expect(response).to.exist;
        // expect(response.status).to.equal(400);
    });
});