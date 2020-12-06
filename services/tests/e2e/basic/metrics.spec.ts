import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import fetch from 'node-fetch';
import { GraphQLClient } from 'graphql-request';
import PrometheusMetricsSerializer from '../../utils/prometheus-metrics-serializer';
import { getToken } from '../../helpers/get-token';
import { UpdateSchemasMutationResponse, createSchemaMutation } from '../../helpers/registry-request-builder';
import { sleep } from '../../helpers/utility';
import { schema1, schema2 } from './metrics.schema';

const gatewayBaseUrl = 'http://localhost:8080';
const registryBaseUrl = 'http://localhost:8090';

const gatewayClient = new GraphQLClient(`${gatewayBaseUrl}/graphql`);
const registryClient = new GraphQLClient(`${registryBaseUrl}/graphql`);

const gatewayMetricsEndpoint = `${gatewayBaseUrl}/metrics`;
const registryMetricsEndpoint = `${registryBaseUrl}/metrics`;

describe('Metrics', () => {
  const query = print(gql`
    query {
      m_foo {
        bar
        baz
        # taz TODO: Fix registry to accept Apollo Federation directives
      }
    }
  `);

  beforeAll(async () => {
    expect.addSnapshotSerializer(PrometheusMetricsSerializer);

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
  });

  test('Setup schema', async () => {
    const updateSchemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: schema1,
    });
    expect(updateSchemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);

    const response = await gatewayClient.request(query);
    expect(response).toBeDefined();
  });

  test('Check metrics', async () => {
    const response = await fetch(gatewayMetricsEndpoint);
    expect(response.ok).toBeTruthy();
    const body = await response.text();
    const metrics = body.split('\n');
    const graphqlMetrics = metrics.filter(m => m.includes('graphql_'));
    expect(graphqlMetrics).toMatchSnapshot();
  });

  test('Change schema', async () => {
    const updateSchemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema: schema2,
    });
    expect(updateSchemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Check metrics again', async () => {
    const response = await fetch(gatewayMetricsEndpoint);
    expect(response.ok).toBeTruthy();
    const body = await response.text();
    const metrics = body.split('\n');
    expect(
      metrics.some(
        m => m === 'graphql_resolver_duration_seconds_count{parentType="MetricsFoo",fieldName="baz",status="success"} 1'
      )
    ).toBeTruthy();
  });

  test('Registry metrics', async () => {
    const response = await fetch(registryMetricsEndpoint);
    expect(response.ok).toBeTruthy();
    const body = await response.text();
    const metrics = body.split('\n');
    expect(metrics.length).toBeGreaterThan(0);
  });
});
