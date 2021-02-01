import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep } from '../../helpers/utility';
import { UpdateSchemasMutationResponse, createSchemaMutation } from '../../helpers/registry-request-builder';
import { getToken, getInvalidToken } from '../../helpers/get-token';
import { startContainerOutputCapture } from '../../helpers/get-container-logs';
import { schema, query } from './verify-jwt.schema';

const formatLogs = (logs: string) =>
  logs
    .split('\n')
    .filter(line => !line.includes('    at ') && !line.includes('[deprecated]'))
    .join('\n')
    .replace(/(?<=durationMs: )\d*\.?\d*/gm, 'XXX');

describe('Authentication - Verify JWT', () => {
  const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
  const registryClient = new GraphQLClient('http://localhost:8090/graphql');

  beforeAll(() => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  test('Setup policies', async () => {
    const schemaResponse: UpdateSchemasMutationResponse = await registryClient.request(createSchemaMutation, {
      schema,
    });
    expect(schemaResponse.updateSchemas.success).toBeTruthy();

    // Wait for gateway to update before next tests
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test('Valid JWT', async () => {
    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    await sleep(50); // wait a bit longer for output capture
    const result = await gatewayClient.request(query);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Invalid JWT', async () => {
    const accessToken = await getInvalidToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Invalid Authentication Scheme', async () => {
    const credentials = Buffer.from('user:pwd').toString('base64');
    gatewayClient.setHeader('Authorization', `Basic ${credentials}`);

    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });

  test('Unknown issuer', async () => {
    const accessToken = await getInvalidToken({ issuer: 'http://microsoft.com' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Unexpected audience', async () => {
    const accessToken = await getInvalidToken({ audience: 'Stitch Other' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('JWK uri is not resolved', async () => {
    const accessToken = await getToken({ tokenEndpoint: 'http://localhost:8071/connect/token' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Second call with valid JWT - JWKs caching', async () => {
    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Authority without discovery endpoint', async () => {
    const accessToken = await getToken({ tokenEndpoint: 'http://localhost:8070/connect/token' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });
});
