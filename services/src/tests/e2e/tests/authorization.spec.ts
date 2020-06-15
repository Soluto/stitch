import {GraphQLClient} from 'graphql-request';
import {sleep} from '../../helpers/utility';
import {
    getSchema,
    getUserQuery,
    createSchemaMutation,
    createPolicyMutation,
    onlyAdminPolicy,
} from '../../helpers/authzSchema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('authorization', () => {
    // This is kind of both the "before" section and a test, but it was weird putting a test in an actual before section
    it('creates the policy and schema resources', async () => {
        const policyResponse = await registryClient.request(createPolicyMutation, {policy: onlyAdminPolicy()});
        expect(policyResponse.updatePolicies.success).toBe(true);

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
});
