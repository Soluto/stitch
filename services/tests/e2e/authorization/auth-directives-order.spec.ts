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
import { schema, policies } from './auth-directives-order.schema';

describe('Authorization - Policy directive order', () => {
  let gatewayClient: GraphQLClient;
  let registryClient: GraphQLClient;

  beforeAll(async () => {
    gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
    registryClient = new GraphQLClient('http://localhost:8090/graphql');

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const registryAccessToken = await getToken({ scope: 'stitch-registry' });
    registryClient.setHeader('Authorization', `Bearer ${registryAccessToken}`);

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
