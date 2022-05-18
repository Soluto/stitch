import { print } from 'graphql';
import { ClientError, GraphQLClient } from 'graphql-request';
import { gql } from 'apollo-server-core';
import {
  RegistryMutationResponse,
  updatePoliciesMutation,
  updateSchemasMutation,
} from '../../helpers/registry-request-builder';
import { updateGatewaySchema } from '../../helpers/utility';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { getToken } from '../../helpers/get-token';
import { policies, schema } from './auth-object-directive.schema';

describe('Authorization - Policy directive on Object', () => {
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

  test('OK for query field without policy of object with allowed policy', async () => {
    const response = await gatewayClient.request(
      print(gql`
        query {
          aod_foo {
            bar
          }
        }
      `)
    );
    expect(response).toMatchSnapshot();
  });

  test('Error for query field with deny policy of object with allowed policy', async () => {
    let response;
    try {
      response = await gatewayClient.request(
        print(gql`
          query {
            aod_foo {
              baz
            }
          }
        `)
      );
    } catch (e) {
      if (e instanceof ClientError) response = e.response;
    }
    expect(response).toMatchSnapshot();
  });

  test('Error for query field without policy of object with deny policy', async () => {
    let response;
    try {
      response = await gatewayClient.request(
        print(gql`
          query {
            aod_foo2 {
              bar2
            }
          }
        `)
      );
    } catch (e) {
      if (e instanceof ClientError) response = e.response;
    }
    expect(response).toMatchSnapshot();
  });
});
