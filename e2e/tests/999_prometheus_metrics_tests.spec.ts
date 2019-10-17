import axios from 'axios';
import { expect } from 'chai';

describe('metrics', () => {
  it('should return metrics for graphql-gateway', async () => {
    const response = await axios.get(`${process.env.GRAPHQL_SERVER_URL}/metrics`);
    // tslint:disable-next-line:no-unused-expression
    expect(response).to.exist;
    expect(response.status).to.equal(200);
    expect(response.data).to.contain('http_request_duration_in_seconds_bucket');
    expect(response.data).to.contain('http_request_total_count');
  });

  it('should return metrics for registry', async () => {
    const response = await axios.get(`${process.env.REGISTRY_URL}/metrics`);
    // tslint:disable-next-line:no-unused-expression
    expect(response).to.exist;
  });

  it('should return metrics for gql-controller', async () => {
    const response = await axios.get(`${process.env.GQL_CONTROLLER_URL}/metrics`);
    // tslint:disable-next-line:no-unused-expression
    expect(response).to.exist;
  });
});
