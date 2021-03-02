/* eslint-disable promise/catch-or-return */
import { join } from 'path';
import { FancyTypes, test } from '@oclif/test';
import * as nock from 'nock';

interface TestCase {
  name: string;
  statusCode: number;
  responseBody: nock.Body;
}

const registryUrl = new URL('http://registry.some-domain.com/graphql');
const authorizationHeader = 'Bearer ABCDEFGHIJKLMNOP';
const sanitizedAuthHeader = 'Bearer ABC**********NOP';

const testCases: TestCase[] = [
  {
    name: 'InternalServerError',
    statusCode: 500,
    responseBody: 'Internal Server Error',
  },
  {
    name: 'Unauthorized',
    statusCode: 401,
    responseBody: 'Unauthorized',
  },
  {
    name: 'GRAPHQL_VALIDATION_FAILED',
    statusCode: 400,
    responseBody: {
      errors: [
        {
          message: 'String cannot represent a non string value: 0',
          extensions: {
            code: 'GRAPHQL_VALIDATION_FAILED',
          },
        },
      ],
    },
  },
  {
    name: 'RESOURCE_VALIDATION_FAILURE',
    statusCode: 200,
    responseBody: {
      errors: [
        {
          message: 'Updated resources request failed: Error: Resource validation failed',
          path: ['updateUpstreams'],
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            exception: { message: 'Updated resources request failed: Error: Resource validation failed' },
          },
        },
      ],
      data: {
        updateUpstreams: null,
      },
    },
  },
];

const commandArgs = [
  'apply:resources',
  '--dry-run',
  `--registry-url=${registryUrl.href}`,
  `--authorization-header=${authorizationHeader}`,
  '--skip-resource-types=upstreams,upstreamClientCredentials',
  join(__dirname, './data/dummy.yaml'),
];

const nockCb = (statusCode: number, responseBody: nock.Body) => (api: FancyTypes.NockScope) =>
  api.post(registryUrl.pathname).reply(statusCode, responseBody);

testCases.forEach(testCase => {
  describe(`Response errors - ${testCase.name}`, () => {
    test
      .nock(registryUrl.origin, nockCb(testCase.statusCode, testCase.responseBody))
      .stdout()
      .command(commandArgs)
      .catch(e => e.message.startsWith('Verifying resources failed'))
      .end('run command with error', ctx => {
        ctx.stdout.includes('Verifying resources failed');
        ctx.stdout.includes(JSON.stringify(testCase.responseBody));
      });
  });

  describe('Response errors - timeout', () => {
    test
      .nock(registryUrl.origin, api => api.post(registryUrl.pathname).delayConnection(200))
      .stdout()
      .command(commandArgs.concat('--timeout=100'))
      .catch(e => e.message.startsWith('Verifying resources failed'))
      .end('run command with error', ctx => {
        ctx.stdout.includes('Verifying resources failed');
        ctx.stdout.includes(JSON.stringify(testCase.responseBody));
        ctx.stdout.includes(`RegistryUrl:    ${registryUrl.href}}`);
        ctx.stdout.includes(`Authorization:    ${sanitizedAuthHeader}}`);
      });
  });
});
