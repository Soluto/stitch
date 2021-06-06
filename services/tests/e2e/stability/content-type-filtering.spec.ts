import fetch from 'node-fetch';

const gatewayBaseUrl = 'http://localhost:8080';

const gatewayGraphqlEndpoint = `${gatewayBaseUrl}/graphql`;

describe('Content-Type filtering', () => {
  test('Return 400 for "multipart/form-data"', async () => {
    const response = await fetch(gatewayGraphqlEndpoint, {
      headers: {
        ['content-type']: 'multipart/form-data',
      },
    });
    expect(response.status).toEqual(400);
  });
});
