import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import fetch from 'node-fetch';
import { GraphQLClient } from 'graphql-request';
import PrometheusMetricsSerializer from '../../utils/prometheus-metrics-serializer';
import { getToken } from '../../helpers/get-token';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { updateGatewaySchema } from '../../helpers/utility';
import { schema1, schema2 } from './metrics.schema';

const gatewayBaseUrl = 'http://localhost:8080';
const registryBaseUrl = 'http://localhost:8090';

const gatewayClient = new GraphQLClient(`${gatewayBaseUrl}/graphql`);
const registryClient = new GraphQLClient(`${registryBaseUrl}/graphql`);

const gatewayMetricsEndpoint = `${gatewayBaseUrl}/metrics`;
const registryMetricsEndpoint = `${registryBaseUrl}/metrics`;

async function getMetrics(endpoint: string) {
  const response = await fetch(endpoint);
  expect(response.ok).toBeTruthy();
  const body = await response.text();
  return body.split('\n');
}

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
    const updateSchemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema1,
    });
    expect(updateSchemaResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);

    const response = await gatewayClient.request(query);
    expect(response).toBeDefined();
  });

  test('Check metrics', async () => {
    const metrics = await getMetrics(gatewayMetricsEndpoint);
    const graphqlMetrics = metrics.filter(m => m.includes('graphql_'));
    expect(graphqlMetrics).toMatchSnapshot();
  });

  test('Change schema', async () => {
    const updateSchemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema: schema2,
    });
    expect(updateSchemaResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);
  });

  test('Check metrics again', async () => {
    const metrics = await getMetrics(gatewayMetricsEndpoint);
    expect(
      metrics.some(
        m => m === 'graphql_resolver_duration_seconds_count{parentType="MetricsFoo",fieldName="baz",status="success"} 1'
      )
    ).toBeTruthy();
  });

  test('Parsing errors metric', async () => {
    await expect(gatewayClient.request('wrong query')).rejects.toMatchSnapshot();

    const metrics = await getMetrics(gatewayMetricsEndpoint);
    expect(metrics.some(m => m === 'graphql_request_parsing_errors_count 1')).toBeTruthy();
  });

  test('Validation errors metric', async () => {
    const query = print(gql`
      query {
        wrong
      }
    `);
    await expect(gatewayClient.request(query)).rejects.toMatchSnapshot();

    const metrics = await getMetrics(gatewayMetricsEndpoint);
    expect(metrics.some(m => m === 'graphql_request_validation_errors_count 1')).toBeTruthy();
  });

  test('Registry metrics', async () => {
    const metrics = await getMetrics(registryMetricsEndpoint);
    const sampleMetric = metrics.find(m => m.startsWith('nodejs_version_info'));
    expect(sampleMetric).toBeDefined();
    const majorVersion = /major="(\d+)"/g.exec(sampleMetric!);
    expect(majorVersion?.[1]).toEqual('14');
  });
});
