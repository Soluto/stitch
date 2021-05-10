import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import { updateGatewaySchema } from '../../helpers/utility';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { getToken } from '../../helpers/get-token';
import { schema } from './ignore-policies.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe.skip('Ignore Policies', () => {
  const query = print(gql`
    query {
      ip_foo
    }
  `);

  beforeAll(async () => {
    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const registryAccessToken = await getToken({ scope: 'stitch-registry' });
    registryClient.setHeader('Authorization', `Bearer ${registryAccessToken}`);
  });

  test('Setup schema', async () => {
    const response = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema,
    });
    expect(response.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);
  });

  test('Call gateway', async () => {
    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });
});
