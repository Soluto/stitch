import {GraphQLClient} from 'graphql-request';
import {sleep} from '../../helpers/utility';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

const nonDefaultSchema = {
    metadata: {namespace: 'namespace', name: 'name'},
    schema: 'type Query { default: String! @stub(value: "NOPE") }',
};

const createSchemaMutation = `
mutation CreateSchema($schema: SchemaInput!) {
    updateSchemas(input: [$schema]) {
        success
    }
}`;

describe('Basic flow', () => {
    test('Default schema works', async () => {
        const response: any = await gatewayClient.request(`query {default}`);

        expect(response.default).toBe('default');
    });

    test('Gateway updates when updating schema in registry', async () => {
        const response1: any = await registryClient.request(createSchemaMutation, {schema: nonDefaultSchema});
        expect(response1.updateSchemas.success).toBe(true);

        // Wait for gateway to update
        await sleep(500);

        const response2: any = await gatewayClient.request(`query {default}`);
        expect(response2.default).toBe('NOPE');
    });
});
