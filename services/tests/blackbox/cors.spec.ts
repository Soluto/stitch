import * as fs from 'fs/promises';
import { FastifyInstance } from 'fastify';
import { createServer as createGateway } from '../../src/gateway';
import { ResourceGroup } from '../../src/modules/resource-repository';

describe('CORS', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const resources: ResourceGroup = {
      schemas: [],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [],
    };

    await fs.writeFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));

    app = await createGateway();
  });

  afterAll(async () => {
    await app.close();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
  });

  test('Preflight request from valid origin', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/graphql',
      headers: {
        origin: 'http://localhost',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'x-api-client,authorization',
      },
    });

    expect(response.statusCode).toEqual(204);
    const headers = Object.fromEntries(
      Object.entries(response.headers).filter(([k]) => k.startsWith('access-control-allow'))
    );
    expect(headers).toMatchSnapshot();
  });

  test('Preflight request from invalid origin', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/graphql',
      headers: {
        origin: 'http://unknown-host',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'x-api-client,authorization,unknown-header',
      },
    });

    expect(response.statusCode).toEqual(204);
    const headers = Object.fromEntries(
      Object.entries(response.headers).filter(([k]) => k.startsWith('access-control-allow'))
    );
    expect(headers).toMatchSnapshot();
  });
});
