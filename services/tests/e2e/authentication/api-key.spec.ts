import { updateGatewaySchema } from '../../helpers/utility';

describe('Authentication - ApiKey', () => {
  const validApiKey = 'validApiKey';
  const invalidApiKey = 'invalidApiKey';
  const disabledApiKey = 'disabledApiKey';

  test('Valid ApiKey', async () => {
    const resp = await updateGatewaySchema('http://localhost:8080', validApiKey);
    expect(resp.status).toEqual(200);
  });

  test('Invalid ApiKey', async () => {
    const resp = await updateGatewaySchema('http://localhost:8080', invalidApiKey);
    expect(resp.status).toEqual(401);
  });

  test('Disabled ApiKey', async () => {
    const resp = await updateGatewaySchema('http://localhost:8080', disabledApiKey);
    expect(resp.status).toEqual(401);
  });
});
