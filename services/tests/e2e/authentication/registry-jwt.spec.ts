import { gql, GraphQLClient } from 'graphql-request';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { getToken, getInvalidToken } from '../../helpers/get-token';

const query = gql`
  query {
    plugins {
      name
      version
    }
  }
`;

describe('Authentication - Verify JWT', () => {
  const registryClient = new GraphQLClient('http://localhost:8090/graphql');

  beforeAll(() => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);
  });

  test('Valid JWT', async () => {
    const accessToken = await getToken({ scope: 'stitch-registry' });
    registryClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const result = await registryClient.request(query);
    expect(result).toMatchSnapshot();
  });

  test('Invalid JWT', async () => {
    const accessToken = await getInvalidToken();
    registryClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const result = await registryClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });

  test('Invalid Authentication Scheme', async () => {
    const credentials = Buffer.from('user:pwd').toString('base64');
    registryClient.setHeader('Authorization', `Basic ${credentials}`);

    const result = await registryClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });

  test('Unknown issuer', async () => {
    const accessToken = await getInvalidToken({ issuer: 'http://microsoft.com' });
    registryClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const result = await registryClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });

  test('Unexpected audience', async () => {
    const accessToken = await getInvalidToken({ audience: 'Stitch Other' });
    registryClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const result = await registryClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });

  test('JWK uri is not resolved', async () => {
    const accessToken = await getToken({ tokenEndpoint: 'http://localhost:8071/connect/token' });
    registryClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const result = await registryClient.request(query).catch(e => e.response);
    expect(result).toMatchSnapshot();
  });

  test('Multiple audiences', async () => {
    const accessToken = await getToken({
      scope: 'stitch-registry stitch-gateway',
    });
    registryClient.setHeader('Authorization', `Bearer ${accessToken}`);

    const result = await registryClient.request(query);
    expect(result).toMatchSnapshot();
  });
});
