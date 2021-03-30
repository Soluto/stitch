import { print } from 'graphql';
import { GraphQLClient } from 'graphql-request';
import { gql } from 'apollo-server-core';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep } from '../../helpers/utility';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { Schema } from '../../../src/modules/resource-repository';

describe('Authentication - ApiKey', () => {
  const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
  const registryClient = new GraphQLClient('http://localhost:8090/graphql');

  const validApiKey = 'validApiKey';
  const invalidApiKey = 'invalidApiKey';
  const disabledApiKey = 'disabledApiKey';

  const schema: Schema = {
    metadata: {
      namespace: 'api_key',
      name: 'Schema',
    },
    schema: print(gql`
      type Query {
        ak_foo: String! @localResolver(value: "FOO")
      }
    `),
  };

  const query = print(gql`
    query {
      ak_foo
    }
  `);

  beforeAll(() => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  test('Setup schema', async () => {
    const schemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema,
    });
    expect(schemaResponse.result.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  // TODO: In this test the request should fail because the key is invalid. But the "/graphql" path is opened for
  // anonymous access so the request passes. In future this test should check the path that isn't opened for anonymous
  // access
  test.skip('Valid ApiKey', async () => {
    gatewayClient.setHeader('x-api-key', validApiKey);

    const result = await gatewayClient.request(query);
    expect(result).toMatchSnapshot();
  });

  test('Invalid ApiKey', async () => {
    gatewayClient.setHeader('x-api-key', invalidApiKey);

    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });

  // TODO: In this test the request should fail because the key is disabled. But the "/graphql" path is opened for
  // anonymous access so the request passes. In future this test should check the path that isn't opened for anonymous
  // access
  test.skip('Disabled ApiKey', async () => {
    gatewayClient.setHeader('x-api-key', disabledApiKey);

    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });
});
