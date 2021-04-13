import { print } from 'graphql';
import { GraphQLClient } from 'graphql-request';
import { gql } from 'apollo-server-core';
import {
  RegistryMutationResponse,
  updatePoliciesMutation,
  updateSchemasMutation,
} from '../../helpers/registry-request-builder';
import { updateGatewaySchema } from '../../helpers/utility';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { getToken } from '../../helpers/get-token';
import { schema, policies, AllowedEmployeeQueryResponse, employeeQuery } from './auth-with-queries.schema';

describe('Authorization with queries', () => {
  let gatewayClient: GraphQLClient;
  let registryClient: GraphQLClient;

  beforeAll(async () => {
    gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
    registryClient = new GraphQLClient('http://localhost:8090/graphql');

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  test('Setup policies', async () => {
    const policyResponse = await registryClient.request<RegistryMutationResponse>(updatePoliciesMutation, {
      policies,
    });
    expect(policyResponse.result.success).toBeTruthy();

    const schemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema,
    });
    expect(schemaResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);
  });

  test('Query always-allow policy', async () => {
    const response = await gatewayClient.request(
      print(gql`
        query {
          policy {
            auth_with_query___always_allow {
              allow
            }
          }
        }
      `)
    );
    expect(response).toMatchSnapshot();
  });

  test('Query alwaysDeny policy', async () => {
    let response;
    try {
      response = await gatewayClient.request(
        print(gql`
          query {
            policy {
              auth_with_query___always_allow {
                allow
              }
            }
          }
        `)
      );
    } catch (e) {
      response = e.response;
    }
    expect(response).toMatchSnapshot();
  });

  test('Query protected field', async () => {
    let response;
    try {
      response = await gatewayClient.request(
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
      response = e.response;
    }
    expect(response).toMatchSnapshot();
  });

  test('Query allowed employee', async () => {
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

  test('Query field with policy with invalid query', async () => {
    let response;
    try {
      response = await gatewayClient.request(
        print(gql`
          query {
            invalidQuery
          }
        `)
      );
    } catch (e) {
      response = e.response;
    }
    expect(response).toMatchSnapshot();
  });
});
