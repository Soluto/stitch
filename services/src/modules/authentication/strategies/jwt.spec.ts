import { JWTAuthConfig } from '../types';
jest.mock('../../config');
import { authenticationConfig } from '../../config';
import jwtAuthStrategy, { JWTAuthPartialRequest } from './jwt';

interface TestCase {
  request: Partial<JWTAuthPartialRequest>;
  config?: JWTAuthConfig;
  shouldThrow?: boolean;
}

const issuer = 'issuer';
const authority = 'authority';
const audience = 'audience';

const url = '/some/path';

const testCases: [string, TestCase][] = [
  [
    'No jwt auth config',
    {
      request: {},
      shouldThrow: true,
    },
  ],
  [
    'No jwt token',
    {
      request: {
        // eslint-disable-next-line unicorn/no-useless-undefined
        decodeJWT: () => undefined,
      },
      config: {
        [issuer]: {
          authority,
          authenticatedPaths: [url],
        },
      },
      shouldThrow: true,
    },
  ],
  [
    'Invalid jwt token',
    {
      request: {
        decodeJWT: () => {
          throw new Error('Invalid JWT');
        },
      },
      config: {
        [issuer]: {
          authority,
          authenticatedPaths: [url],
        },
      },
      shouldThrow: true,
    },
  ],
  [
    'Unknown issuer',
    {
      request: {
        decodeJWT: () => ({
          header: {},
          payload: {
            iss: 'unknown-issuer',
          },
          signature: 'signature',
        }),
      },
      config: {
        [issuer]: {
          authority,
          authenticatedPaths: [url],
        },
      },
      shouldThrow: true,
    },
  ],
  [
    'Unexpected audience',
    {
      request: {
        decodeJWT: () => ({
          header: {},
          payload: {
            iss: issuer,
            aud: 'unexpected-audience',
          },
          signature: 'signature',
        }),
      },
      config: {
        [issuer]: {
          authority,
          audience,
          authenticatedPaths: [url],
        },
      },
      shouldThrow: true,
    },
  ],
  [
    'Unexpected audience - array',
    {
      request: {
        decodeJWT: () => ({
          header: {},
          payload: {
            iss: issuer,
            aud: ['unexpected-audience'],
          },
          signature: 'signature',
        }),
      },
      config: {
        [issuer]: {
          authority,
          audience: [audience],
          authenticatedPaths: [url],
        },
      },
      shouldThrow: true,
    },
  ],
  [
    'Unexpected path',
    {
      request: {
        decodeJWT: () => ({
          header: {},
          payload: {
            iss: issuer,
            aud: [audience, 'another-audience'],
          },
          signature: 'signature',
        }),
        raw: {
          url: '/unexpected/path',
        },
      },
      config: {
        [issuer]: {
          authority,
          audience,
          authenticatedPaths: [url],
        },
      },
      shouldThrow: true,
    },
  ],
  [
    'Verify JWT failed',
    {
      request: {
        decodeJWT: () => ({
          header: {},
          payload: {
            iss: issuer,
            aud: audience,
          },
          signature: 'signature',
        }),
        jwtVerify: () => Promise.reject('Something wrong'),
      },
      config: {
        [issuer]: {
          authority,
          audience: [audience, 'another-audience'],
          authenticatedPaths: [url],
        },
      },
      shouldThrow: true,
    },
  ],
  [
    'Valid JWT',
    {
      request: {
        decodeJWT: () => ({
          header: {},
          payload: {
            iss: issuer,
            aud: [audience, 'other-one'],
          },
          signature: 'signature',
        }),
      },
      config: {
        [issuer]: {
          authority,
          audience: [audience, 'another-audience'],
          authenticatedPaths: [url],
        },
      },
    },
  ],
];

const defaultRequest: JWTAuthPartialRequest = {
  raw: {
    url,
  },
  decodeJWT: () => ({ header: {}, payload: {}, signature: '' }),
  jwtVerify: () => Promise.resolve(),
};

describe('JWT auth strategy', () => {
  test.each(testCases)('%s', async (_, { request, config, shouldThrow = false }) => {
    authenticationConfig.jwt = config;
    try {
      await jwtAuthStrategy({ ...defaultRequest, ...request });
      expect(shouldThrow).toBeFalsy();
    } catch (err) {
      expect(shouldThrow).toBeTruthy();
      expect(err).toMatchSnapshot();
    }
  });
});
