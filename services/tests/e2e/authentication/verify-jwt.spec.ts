import { GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep, updateGatewaySchema } from '../../helpers/utility';
import { RegistryMutationResponse, updateSchemasMutation } from '../../helpers/registry-request-builder';
import { getToken, getInvalidToken } from '../../helpers/get-token';
import { startContainerOutputCapture } from '../../helpers/get-container-logs';
import { schema, query, variables } from './verify-jwt.schema';

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
    const registryAccessToken = await getToken({ scope: 'stitch-registry' });
    registryClient.setHeader('Authorization', `Bearer ${registryAccessToken}`);

    const schemaResponse = await registryClient.request<RegistryMutationResponse>(updateSchemasMutation, {
      schema,
    });
    expect(schemaResponse.result.success).toBeTruthy();

    const resp = await updateGatewaySchema('http://localhost:8080');
    expect(resp.status).toEqual(200);
  });

  test('Valid JWT', async () => {
    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    await sleep(50); // wait a bit longer for output capture
    const result = await gatewayClient.request(query, variables);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Invalid JWT', async () => {
    const accessToken = await getInvalidToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query, variables).catch(e => e.response);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Invalid Authentication Scheme', async () => {
    const credentials = Buffer.from('user:pwd').toString('base64');
    gatewayClient.setHeader('Authorization', `Basic ${credentials}`);

    const result = await gatewayClient.request(query, variables).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });

  test('Unknown issuer', async () => {
    const accessToken = await getInvalidToken({ issuer: 'http://microsoft.com' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query, variables).catch(e => e.response);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Unexpected audience', async () => {
    const accessToken = await getInvalidToken({ audience: 'Stitch Other' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query, variables).catch(e => e.response);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('JWK uri is not resolved', async () => {
    const accessToken = await getToken({ tokenEndpoint: 'http://localhost:8071/connect/token' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query, variables).catch(e => e.response);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Second call with valid JWT - JWKs caching', async () => {
    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query, variables);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Authority without discovery endpoint', async () => {
    const accessToken = await getToken({ tokenEndpoint: 'http://localhost:8070/connect/token' });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query, variables);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });

  test('Multiple audiences', async () => {
    const accessToken = await getToken({
      tokenEndpoint: 'http://localhost:8070/connect/token',
      scope: 'stitch-gateway some-rest-service',
    });
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const endContainerOutputCapture = await startContainerOutputCapture('gateway');
    const result = await gatewayClient.request(query, variables);
    expect(result).toMatchSnapshot();

    const captureResult = await endContainerOutputCapture();
    const logs = formatLogs(captureResult);
    expect(logs).toMatchSnapshot('gateway logs');
  });
});
