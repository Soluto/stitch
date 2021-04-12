import { ApiKeyAuthConfig } from '../types';
jest.mock('../../config');
import { authenticationConfig } from '../../config';
import apiKeyAuthStrategy, { ApiKeyAuthPartialRequest } from './api-key';

interface TestCase {
  request: Partial<ApiKeyAuthPartialRequest>;
  config?: ApiKeyAuthConfig;
  shouldThrow?: boolean;
}

const header = 'x-api-key';
const queryParam = 'apiKey';

const url = '/some/path';

const disabledKey = 'disabledKey';
const validKey = 'validKey';

const testCases: [string, TestCase][] = [
  [
    'No api key and no api key auth config',
    {
      request: {},
      shouldThrow: true,
    },
  ],
  [
    'Api key header does not exist',
    {
      request: {},
      config: {
        header,
        keys: {},
        authenticatedPaths: [],
      },
      shouldThrow: true,
    },
  ],
  [
    'Api key query param does not exist',
    {
      request: {},
      config: {
        queryParam,
        keys: {},
        authenticatedPaths: [],
      },
      shouldThrow: true,
    },
  ],
  [
    'Unexpected api key from header',
    {
      request: {
        headers: {
          header: 'invalid-key',
        },
      },
      config: {
        header,
        keys: {},
        authenticatedPaths: [],
      },
      shouldThrow: true,
    },
  ],
  [
    'Disabled api key from header',
    {
      request: {
        headers: {
          header: disabledKey,
        },
      },
      config: {
        header,
        keys: {
          [disabledKey]: {
            name: 'Disabled key',
            disabled: true,
          },
        },
        authenticatedPaths: [],
      },
      shouldThrow: true,
    },
  ],
  [
    'Valid api key from header but invalid path',
    {
      request: {
        headers: {
          [header]: validKey,
        },
        raw: {
          url: '/unexpected/path',
        },
      },
      config: {
        header,
        keys: {
          [validKey]: {
            name: 'Valid key',
          },
        },
        authenticatedPaths: [url],
      },
      shouldThrow: true,
    },
  ],
  [
    'Valid api key from header',
    {
      request: {
        headers: {
          [header]: validKey,
        },
      },
      config: {
        header,
        keys: {
          [validKey]: {
            name: 'Valid key',
          },
        },
        authenticatedPaths: [url],
      },
    },
  ],
  [
    'Valid api key from query param',
    {
      request: {
        query: {
          [queryParam]: validKey,
        },
      },
      config: {
        queryParam,
        keys: {
          [validKey]: {
            name: 'Valid key',
          },
        },
        authenticatedPaths: [url],
      },
    },
  ],
];

const defaultRequest: ApiKeyAuthPartialRequest = {
  headers: {},
  query: {},
  raw: {
    url,
  },
};

describe('ApiKey auth strategy', () => {
  test.each(testCases)('%s', async (_, { request, config, shouldThrow = false }) => {
    authenticationConfig.apiKey = config;
    try {
      await apiKeyAuthStrategy({ ...defaultRequest, ...request });
      expect(shouldThrow).toBeFalsy();
    } catch (err) {
      expect(shouldThrow).toBeTruthy();
      expect(err).toMatchSnapshot();
    }
  });
});
