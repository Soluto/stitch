import fetch from 'node-fetch';
import PrometheusMetricsSerializer from '../../utils/prometheus-metrics-serializer';

describe('Metrics', () => {
  beforeAll(() => {
    expect.addSnapshotSerializer(PrometheusMetricsSerializer);
  });

  test('Check metrics', async () => {
    const response = await fetch('http://localhost:8080/metrics');
    expect(response.ok).toBeTruthy();
    const body = await response.text();
    const metrics = body.split('\n');
    const httpMetrics = metrics.filter(m => m.includes('graphql_'));
    expect(httpMetrics).toMatchSnapshot();
  });
});
