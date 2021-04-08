import { AnonymousAuthConfig } from '../types';
jest.mock('../../config');
import { authenticationConfig } from '../../config';
import anonymousAuthStrategy, { AnonymousAuthPartialRequest } from './anonymous';

interface TestCase {
  request: Partial<AnonymousAuthPartialRequest>;
  config?: AnonymousAuthConfig;
  shouldThrow?: boolean;
}

const url = '/some/path';

const testCases: [string, TestCase][] = [
  [
    'No anonymous auth config',
    {
      request: {},
      shouldThrow: true,
    },
  ],
  [
    'Unexpected path',
    {
      request: {
        raw: {
          url: '/unexpected/path',
        },
      },
      config: {
        publicPaths: [url],
      },
      shouldThrow: true,
    },
  ],
  [
    'Reject authorization header',
    {
      request: {
        headers: {
          authorization: 'Bearer JWT',
        },
        raw: {
          url,
        },
      },
      config: {
        rejectAuthorizationHeader: true,
        publicPaths: [url],
      },
      shouldThrow: true,
    },
  ],
  [
    'Valid request',
    {
      request: {
        raw: {
          url,
        },
      },
      config: {
        rejectAuthorizationHeader: true,
        publicPaths: [url],
      },
    },
  ],
  [
    'Valid request with authorization header',
    {
      request: {
        headers: {
          authorization: 'Bearer JWT',
        },
        raw: {
          url,
        },
      },
      config: {
        publicPaths: [url],
      },
    },
  ],
];

const defaultRequest: AnonymousAuthPartialRequest = {
  raw: {
    url: '/graphql',
  },
};

describe('Anonymous auth strategy', () => {
  test.each(testCases)('%s', async (_, { request, config, shouldThrow = false }) => {
    authenticationConfig.anonymous = config;
    try {
      await anonymousAuthStrategy({ ...defaultRequest, ...request });
      expect(shouldThrow).toBeFalsy();
    } catch (err) {
      expect(shouldThrow).toBeTruthy();
      expect(err).toMatchSnapshot();
    }
  });
});
