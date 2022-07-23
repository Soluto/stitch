import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { ClientError, GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep, updateGatewaySchema } from '../../helpers/utility';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { getToken } from '../../helpers/get-token';
import { invalidSchema, schema1, schema2, schema3 } from './hello-world.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('Basic flow', () => {
  const query = print(gql`
    query {
      foo
    }
  `);

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const registryAccessToken = await getToken({ scope: 'stitch-registry' });
    registryClient.setHeader('Authorization', `Bearer ${registryAccessToken}`);
  });

  test('Update schema and query new fields', async () => {
    const response1 = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema1,
    });
    expect(response1.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);

    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });

  test('Update schema and query again', async () => {
    const response2 = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema2,
    });
    expect(response2.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);

    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });

  test('Update schema, wait for interval update and query', async () => {
    const response3 = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema3,
    });
    expect(response3.result.success).toBeTruthy();

    await sleep(1500);

    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });

  test('Send wrong schema', async () => {
    let response;
    try {
      await registryClient.request(updateSchemasMutation, {
        schema: invalidSchema,
      });
    } catch (e) {
      if (e instanceof ClientError) response = e.response;
    }
    expect(response).toMatchSnapshot();
  });
});
