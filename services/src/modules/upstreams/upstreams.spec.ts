import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';
import { ResourceMetadata, ResourceGroup } from '../resource-repository';
import { applyUpstream, RequestParams } from '.';

interface TestCase {
  resourceGroupPart: Partial<Pick<ResourceGroup, 'upstreams' | 'defaultUpstream'>>;
  requestParams: Partial<RequestParams>;
  incomingRequest?: Pick<FastifyRequest, 'headers'>;
}

const metadata: ResourceMetadata = {
  namespace: 'upstream-test',
  name: 'upstream',
};

const testCases: [string, TestCase][] = [
  [
    'No upstream',
    {
      resourceGroupPart: {},
      requestParams: {},
    },
  ],
  [
    'Change url',
    {
      resourceGroupPart: {
        upstreams: [
          {
            metadata,
            sourceHosts: ['maps.google.com'],
            targetOrigin: 'https://www.facebook.com',
          },
        ],
      },
      requestParams: {},
    },
  ],
  [
    'Add header',
    {
      resourceGroupPart: {
        upstreams: [
          {
            metadata,
            sourceHosts: ['maps.google.com'],
            headers: [{ name: 'x-api-client', value: 'upstream-tests' }],
          },
        ],
      },
      requestParams: {},
    },
  ],
  [
    'Add header from incoming request',
    {
      resourceGroupPart: {
        upstreams: [
          {
            metadata,
            sourceHosts: ['maps.google.com'],
            headers: [{ name: 'transactionId', value: '{incomingRequest?.headers?.transactionId}' }],
          },
        ],
      },
      requestParams: {},
      incomingRequest: {
        headers: {
          transactionId: '1',
        },
      },
    },
  ],
  [
    'Default default upstream',
    {
      resourceGroupPart: {},
      requestParams: {},
      incomingRequest: {
        headers: {
          authorization: 'Bearer S0mTh1nG',
        },
      },
    },
  ],
  [
    'Custom default upstream',
    {
      resourceGroupPart: {
        defaultUpstream: {
          headers: [{ name: 'authorization', value: '{incomingRequest?.headers?.authorization.toLowerCase()}' }],
        },
      },
      requestParams: {},
      incomingRequest: {
        headers: {
          authorization: 'Bearer S0mTh1nG',
        },
      },
    },
  ],
  [
    'Custom default upstream and upstream',
    {
      resourceGroupPart: {
        upstreams: [
          {
            metadata,
            sourceHosts: ['maps.google.com'],
            headers: [{ name: 'authorization', value: '{incomingRequest?.headers?.authorization.toUpperCase()}' }],
          },
        ],
        defaultUpstream: {
          headers: [{ name: 'authorization', value: '{incomingRequest?.headers?.authorization.toLowerCase()}' }],
        },
      },
      requestParams: {},
      incomingRequest: {
        headers: {
          authorization: 'Bearer S0mTh1nG',
        },
      },
    },
  ],
];

describe('Upstreams', () => {
  const defaultResourceGroup: ResourceGroup = {
    schemas: [],
    upstreams: [],
    upstreamClientCredentials: [],
    policies: [],
  };

  const defaultRequestParams: RequestParams = {
    url: new URL('https://maps.google.com/api/v1/get-location?city=TelAviv'),
    headers: {
      ['Host']: 'maps.google.com',
      ['Content-Type']: 'application/json',
    },
    method: 'POST',
  };

  test.each(testCases)('%s', async (_testCaseName, { requestParams, resourceGroupPart, incomingRequest }) => {
    const resourceGroup = { ...defaultResourceGroup, ...resourceGroupPart };
    const request = _.cloneDeep({ ...defaultRequestParams, ...requestParams });
    const result = await applyUpstream(request, resourceGroup, undefined as any, incomingRequest);
    expect(result).toMatchSnapshot();
  });
});
