import { print } from 'graphql';
import { GraphQLClient } from 'graphql-request';
import { gql } from 'apollo-server-core';
import {
  createSchemaMutation,
  CreatePolicyMutationResponse,
  createPolicyMutation,
  UpdateSchemasMutationResponse,
} from '../../../helpers/registry-request-builder';
import { sleep } from '../../../helpers/utility';
import GraphQLErrorSerializer from '../../../utils/graphql-error-serializer';
import { schema, policies, AllowedEmployeeQueryResponse, employeeQuery } from './auth-with-queries.schema';

describe('Authorization with queries', () => {
  let gatewayClient: GraphQLClient;
  let registryClient: GraphQLClient;

  beforeAll(() => {
    gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
    registryClient = new GraphQLClient('http://localhost:8090/graphql');
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
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
    await sleep(500);
  });

  test('Query allowed employee', async () => {
    try {
      await gatewayClient.request(
        print(gql`
          query {
            classifiedDepartments {
              id
              name
            }
          }
        `)
      );
    } catch (e) {
      const response = e.response;
      expect(response).toMatchSnapshot();
    }

    const response: AllowedEmployeeQueryResponse = await gatewayClient.request(employeeQuery('allowedEmployee'));
    expect(response.allowedEmployee).toMatchSnapshot();
  });

  test('Query denied employee 1', async () => {
    let response;
    try {
      response = await gatewayClient.request(employeeQuery('deniedEmployee1'));
    } catch (e) {
      response = e.response;
    }
    expect(response).toMatchSnapshot();
  });

  test('Query denied employee 2', async () => {
    let response;
    try {
      response = await gatewayClient.request(employeeQuery('deniedEmployee2'));
    } catch (e) {
      response = e.response;
    }
    expect(response).toMatchSnapshot();
  });
});
