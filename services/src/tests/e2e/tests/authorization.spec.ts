import {GraphQLClient} from 'graphql-request';
import {sleep} from '../../helpers/utility';
import {
    getSchema,
    getUserQuery,
    createSchemaMutation,
    createPolicyMutation,
    onlyAdminPolicy,
    jwtNamePolicy,
    getArbitraryDataQuery,
} from '../../helpers/authzSchema';

const gatewayClient = createGatewayClient();
const registryClient = createRegistryClient();

describe('authorization', () => {
    // This is kind of both the "before" section and a test, but it was weird putting a test in an actual before section
    it('creates the policy and schema resources', async () => {
        const policy1Response = await registryClient.request(createPolicyMutation, {policy: onlyAdminPolicy()});
        expect(policy1Response.updatePolicies.success).toBe(true);

        const policy2Response = await registryClient.request(createPolicyMutation, {policy: jwtNamePolicy()});
        expect(policy2Response.updatePolicies.success).toBe(true);

        const schemaResponse = await registryClient.request(createSchemaMutation, {schema: getSchema()});
        expect(schemaResponse.updateSchemas.success).toBe(true);

        // Wait for gateway to update before next tests
        await sleep(500);
    });

    it('allows access to a field based on an argument using param injection from source', async () => {
        const response = await gatewayClient.request(getUserQuery('userAdmin'));
        expect(response.userAdmin).toEqual({firstName: 'John', lastName: 'Smith', role: 'admin'});
    });

    it('rejects access to a field when policy test fails, but still returns the other fields', async () => {
        let response;
        try {
            await gatewayClient.request(getUserQuery('user'));
        } catch (err) {
            response = err.response;
        }

        expect(response.errors).toHaveLength(1);
        expect(response.errors[0].message).toBe('Unauthorized by policy onlyAdmin in namespace ns');
        expect(response.errors[0].path).toEqual(['user', 'lastName']);
        expect(response.data.user).toEqual({firstName: 'John', lastName: null, role: 'normal'});
    });

    it('rejects access to a field based on JWT info when no JWT is sent', async () => {
        let response;
        try {
            await gatewayClient.request(getArbitraryDataQuery());
        } catch (err) {
            response = err.response;
        }

        expect(response.errors).toHaveLength(1);
        expect(response.errors[0].message).toBe('Unauthorized by policy jwtName in namespace ns');
        expect(response.errors[0].path).toEqual(['arbitraryData', 'arbitraryField']);
        expect(response.data.arbitraryData).toEqual({arbitraryField: null});
    });

    it('rejects access to a field based on JWT info', async () => {
        const gatewayClientJwt = createGatewayClient(disallowedJwtOptions());
        let response;
        try {
            await gatewayClientJwt.request(getArbitraryDataQuery());
        } catch (err) {
            response = err.response;
        }

        expect(response.errors).toHaveLength(1);
        expect(response.errors[0].message).toBe('Unauthorized by policy jwtName in namespace ns');
        expect(response.errors[0].path).toEqual(['arbitraryData', 'arbitraryField']);
        expect(response.data.arbitraryData).toEqual({arbitraryField: null});
    });

    it('allows access to a field based on JWT info', async () => {
        const gatewayClientJwt = createGatewayClient(allowedJwtOptions());
        const response = await gatewayClientJwt.request(getArbitraryDataQuery());
        expect(response.arbitraryData).toEqual({arbitraryField: 'arbitraryValue'});
    });
});

function allowedJwtOptions() {
    // Claims: { "name": "Varg", "sub": "1234567890", "iat": 1516239022 }
    const encodedJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlZhcmciLCJpYXQiOjE1MTYyMzkwMjJ9.MEXFHfBaci44tuGREvCK1vZ-KqYL7L-TYqO7v0jfsYM';
    return {headers: {authorization: `Bearer ${encodedJwt}`}};
}

function disallowedJwtOptions() {
    // Claims: { "name": "Orm", "sub": "1234567890", "iat": 1516239022 }
    const encodedJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik9ybSIsImlhdCI6MTUxNjIzOTAyMn0.ZQ__h2OJR8A7uSKTZ3QC0jP5P3U3a1JuMU9xVnzWTIM';
    return {headers: {authorization: `Bearer ${encodedJwt}`}};
}

function createRegistryClient(options = {}) {
    return new GraphQLClient('http://localhost:8090/graphql', options);
}

function createGatewayClient(options = {}) {
    return new GraphQLClient('http://localhost:8080/graphql', options);
}
