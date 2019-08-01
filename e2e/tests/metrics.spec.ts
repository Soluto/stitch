import axios from "axios";
import { expect } from "chai";

describe("metrics", () => {
    it("should return metrics for graphql-gateway", async () => {
        const respose = await axios.get(`${process.env.GRAPHQL_SERVER_URL}/metrics`);
        // tslint:disable-next-line:no-unused-expression
        expect(respose).to.exist;
    });

    it("should return metrics for registry", async () => {
        const respose = await axios.get(`${process.env.REGISTRY_URL}/metrics`);
        // tslint:disable-next-line:no-unused-expression
        expect(respose).to.exist;
    });

    it("should return metrics for gql-controller", async () => {
        const respose = await axios.get(`${process.env.GQL_CONTROLLER_URL}/metrics`);
        // tslint:disable-next-line:no-unused-expression
        expect(respose).to.exist;
    });
});
