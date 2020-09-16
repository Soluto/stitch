import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { getToken } from '../../helpers/get-token';
import { UpdateSchemasMutationResponse, createSchemaMutation } from '../../helpers/registry-request-builder';
import { sleep } from '../../helpers/utility';
import { schema } from './argument-injection.schema';

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

describe('Argument Injection', () => {
  const query = print(gql`
    query {
      ai_foo(bar: "bar")
    }
  `);

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
  });

  test('Setup schema', async () => {
    const updateSchemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: schema,
    });
    expect(updateSchemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);

    const response = await gatewayClient.request(query);
    expect(response).toBeDefined();
  });

  test('Check argument injection', async () => {
    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });
});
