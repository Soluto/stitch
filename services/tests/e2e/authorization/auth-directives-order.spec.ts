import { print } from 'graphql';
import { GraphQLClient } from 'graphql-request';
import { gql } from 'apollo-server-core';
import {
  emptySchema,
  createSchemaMutation,
  CreatePolicyMutationResponse,
  createPolicyMutation,
  UpdateSchemasMutationResponse,
} from '../../helpers/registry-request-builder';
import { sleep } from '../../helpers/utility';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { schema, policies } from './auth-directives-order.schema';

describe('Authorization - Policy directive order', () => {
  let gatewayClient: GraphQLClient;
  let registryClient: GraphQLClient;

  beforeAll(() => {
    gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
    registryClient = new GraphQLClient('http://localhost:8090/graphql');

    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  afterAll(async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: emptySchema(schema),
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Setup policies', async () => {
    const policyResponse: CreatePolicyMutationResponse = await registryClient.request(createPolicyMutation, {
      policies,
    });
    expect(policyResponse.updatePolicies.success).toBeTruthy();

    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema,
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Query should return error', async () => {
    let response;
    try {
      response = await gatewayClient.request(
        print(gql`
          query {
            ado_foo
          }
        `)
      );
    } catch (e) {
      response = e.response;
    }
    expect(response).toMatchSnapshot();
  });
});
