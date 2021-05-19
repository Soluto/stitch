import { startContainerOutputCapture } from '../../helpers/get-container-logs';
import { updateGatewaySchema } from '../../helpers/utility';

describe('Child loggers levels', () => {
  const validApiKey = 'validApiKey';
  const invalidApiKey = 'invalidApiKey';

  test('No logs for valid key', async () => {
    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const resp = await updateGatewaySchema('http://localhost:8080', validApiKey);
    expect(resp.status).toEqual(200);

    const captureResult = await endContainerOutputCapture();
    expect(captureResult).toMatchSnapshot();
  });

  test('No trace logs for invalid key', async () => {
    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const resp = await updateGatewaySchema('http://localhost:8080', invalidApiKey);
    expect(resp.status).toEqual(401);

    const captureResult = await endContainerOutputCapture();
    expect(captureResult).toMatchSnapshot();
  });
});
