import fetch from 'node-fetch';

describe('Gateway Authentication - Anonymous', () => {
  const metricsEndpoint = 'http://localhost:8080/metrics';

  test('Without authorization header', async () => {
    const response = await fetch(metricsEndpoint);
    expect(response.ok).toBeTruthy();
  });

  test('With authorization header', async () => {
    const response = await fetch(metricsEndpoint, {
      headers: {
        authorization: 'Something',
      },
    });
    expect(response.status).toEqual(401);
  });
});

describe('Registry Authentication - Anonymous', () => {
  const metricsEndpoint = 'http://localhost:8090/metrics';

  test('Without authorization header', async () => {
    const response = await fetch(metricsEndpoint);
    expect(response.ok).toBeTruthy();
  });

  test('With authorization header', async () => {
    const response = await fetch(metricsEndpoint, {
      headers: {
        authorization: 'Something',
      },
    });
    expect(response.status).toEqual(401);
  });
});
