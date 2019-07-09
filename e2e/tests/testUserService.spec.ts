import { expect } from 'chai';
import { GraphQLClient } from 'graphql-request';


describe('User service', () => {

    const expectedResponse = {
        user: {
            firstName: 'john',
            id: '1',
            lastName: 'doe',
            subscription: {
                expirationDate: '2019-01-01T00:00:00Z',
                plan: 'trial'
            }
        }
    };

    let client: GraphQLClient;

    before(() => {
        client = new GraphQLClient(`${process.env.GRAPHQL_SERVER_URL}/graphql`);
    });

    it('should return user data', async () => {
        const response = await client.request(`{
            user(id: "1") {
              id
              lastName
              firstName
              subscription {
                plan
                expirationDate
              }
            }
          }`);

        expect(response).to.exist;
        expect(response).to.deep.equal(expectedResponse);
    });
});