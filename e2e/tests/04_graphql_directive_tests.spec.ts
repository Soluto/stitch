import { expect } from "chai";
import { GraphQLClient } from "graphql-request";
import { getToken } from "../utils/token-utils";


describe("Graphql Directive tests", () => {

    const expectedResponse = {
        user: {
            firstName: "john",
            id: "1",
            lastName: "doe",
            subscription: {
                expirationDate: "2019-01-01T00:00:00Z",
                plan: "trial"
            },
            books: [
                {
                    title: "Harry Potter and the Chamber of Secrets",
                    author: "J.K. Rowling",
                },
                {
                    title: "Jurassic Park",
                    author: "Michael Crichton",
                },
            ],
            favoriteBook: {
                title: "A Game of Thrones"
            }
        }
    };

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

    it("should return user data", async () => {
        const response = await client.request(`{
            user(id: "1") {
                id
                lastName
                firstName
                subscription {
                    plan
                    expirationDate
                }
                books {
                    title
                    author
                }
                favoriteBook {
                    title
                }
            }
        }`);
        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });
});