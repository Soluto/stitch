import * as nock from 'nock';
import fetch from 'node-fetch';
import { InMemoryLRUCache } from 'apollo-server-caching';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { RequestContext } from '../../context';
import { RESTDirectiveDataSource } from './datasource';
import { RestParams } from './types';

jest.mock('../../logger');

interface TestCase {
  setup: () => nock.Scope;
  restParams: Partial<RestParams>;
  fieldResolverParams: Partial<GraphQLFieldResolverParams<unknown, RequestContext>>;
  shouldSkipRequest?: boolean;
}

const remoteHost = 'http://somewhere';
const remoteHostResponse = JSON.stringify('DATA');

const testCases: [string, TestCase][] = [
  [
    'Defaults to GET',
    {
      setup: () => nock(remoteHost).get('/').reply(200, remoteHostResponse),
      restParams: {},
      fieldResolverParams: {},
    },
  ],
  [
    'Includes query parameters, static ones & from params & arrays from params',
    {
      setup: () =>
        nock(remoteHost)
          .get('/')
          .query({
            mykey: 'myvalue',
            owner: 'aviv',
            child: ['one', 'two', 'thee'],
          })
          .reply(200, remoteHostResponse),
      restParams: {
        query: [
          { key: 'mykey', value: 'myvalue' },
          { key: 'owner', value: '{args.name}' },
          { key: 'child', value: '{source.children}' },
        ],
      },
      fieldResolverParams: {
        source: {
          children: ['one', 'two', 'thee'],
        },
        args: {
          name: 'aviv',
        },
      },
    },
  ],
  [
    'Includes headers',
    {
      setup: () =>
        nock(remoteHost)
          .get('/')
          .matchHeader('mykey', 'myvalue')
          .matchHeader('owner', 'aviv')
          .reply(200, remoteHostResponse),
      restParams: {
        headers: [
          { key: 'mykey', value: 'myvalue' },
          { key: 'owner', value: '{args.name}' },
        ],
      },
      fieldResolverParams: {
        args: { name: 'aviv' },
      },
    },
  ],
  [
    'Skips headers and query params who resolve to undefined',
    {
      setup: () => nock(remoteHost).get('/').reply(200, remoteHostResponse),
      restParams: {
        query: [{ key: 'name', value: '{source.firstName}' }],
        headers: [{ key: 'name', value: '{source.firstName}' }],
      },
      fieldResolverParams: {
        source: { firstName: undefined },
      },
    },
  ],
  [
    'Sends request if required headers are included',
    {
      setup: () =>
        nock(remoteHost)
          .matchHeader('mykey', 'myvalue')
          .matchHeader('owner', 'aviv')
          .get('/')
          .reply(200, remoteHostResponse),
      restParams: {
        headers: [
          { key: 'mykey', value: 'myvalue', required: true },
          { key: 'owner', value: '{args.name}' },
        ],
      },
      fieldResolverParams: {
        args: { name: 'aviv' },
      },
    },
  ],
  [
    'Does not send request if required headers are empty',
    {
      setup: () => nock(remoteHost).get('/').reply(200, remoteHostResponse),
      restParams: {
        headers: [
          { key: 'mykey', value: '', required: true },
          { key: 'owner', value: '{args.name}' },
        ],
      },
      fieldResolverParams: {
        args: { name: 'aviv' },
      },
      shouldSkipRequest: true,
    },
  ],
  [
    'Sends request when header is missing the value and required is not set (default false)',
    {
      setup: () => nock(remoteHost).get('/').matchHeader('owner', 'aviv').reply(200, remoteHostResponse),
      restParams: {
        headers: [
          { key: 'mykey', value: '' },
          { key: 'owner', value: '{args.name}' },
        ],
      },
      fieldResolverParams: {
        args: { name: 'aviv' },
      },
    },
  ],
  [
    'Supported http methods dispatch with the correct http method (GET)',
    {
      setup: () => nock(remoteHost).get('/').reply(200, remoteHostResponse),
      restParams: {
        method: 'get',
      },
      fieldResolverParams: {},
    },
  ],
  [
    'Supported http methods dispatch with the correct http method (POST)',
    {
      setup: () => nock(remoteHost).post('/').reply(200, remoteHostResponse),
      restParams: {
        method: 'post',
      },
      fieldResolverParams: {},
    },
  ],
  [
    'Supported http methods dispatch with the correct http method (PUT)',
    {
      setup: () => nock(remoteHost).put('/').reply(200, remoteHostResponse),
      restParams: {
        method: 'put',
      },
      fieldResolverParams: {},
    },
  ],
  [
    'Supported http methods dispatch with the correct http method (PATCH)',
    {
      setup: () => nock(remoteHost).patch('/').reply(200, remoteHostResponse),
      restParams: {
        method: 'patch',
      },
      fieldResolverParams: {},
    },
  ],
  [
    'Supported http methods dispatch with the correct http method (DELETE)',
    {
      setup: () => nock(remoteHost).delete('/').reply(200, remoteHostResponse),
      restParams: {
        method: 'delete',
      },
      fieldResolverParams: {},
    },
  ],
  [
    'Adds stringified JSON body',
    {
      setup: () =>
        nock(remoteHost)
          .post('/', JSON.stringify({ name: 'aviv' }))
          .reply(200, remoteHostResponse),
      restParams: {
        method: 'POST',
        bodyArg: 'input',
      },
      fieldResolverParams: {
        args: { input: { name: 'aviv' } },
      },
    },
  ],
  [
    'Sends request if required query parameters are included',
    {
      setup: () => nock(remoteHost).get('/').query({ field1: 'value1' }).reply(200, remoteHostResponse),
      restParams: {
        query: [{ key: 'field1', value: 'value1', required: true }],
      },
      fieldResolverParams: {},
    },
  ],
  [
    'Does not send request if required query parameters are missing values',
    {
      setup: () => nock(remoteHost).get('/').reply(200, remoteHostResponse),
      restParams: {
        query: [{ key: 'field1', value: '', required: true }],
      },
      fieldResolverParams: {},
      shouldSkipRequest: true,
    },
  ],
  [
    'Properly handles boolean query parameter values',
    {
      setup: () => nock(remoteHost).get('/').query({ field1: false }).reply(200, remoteHostResponse),
      restParams: {
        query: [{ key: 'field1', value: 'false', required: true }],
      },
      fieldResolverParams: {},
    },
  ],
  [
    'Sends request when empty values are sent in the query params and required is not set (default false)',
    {
      setup: () => nock(remoteHost).get('/').reply(200, remoteHostResponse),
      restParams: {
        query: [{ key: 'field1', value: '' }],
      },
      fieldResolverParams: {},
    },
  ],
];

const emptyContext = {
  resourceGroup: {
    upstreams: [],
  },
  request: { headers: {} },
};

describe('REST directive data source', () => {
  let ds: RESTDirectiveDataSource;

  const defaultRestParams: RestParams = {
    url: remoteHost,
  };

  const defaultFieldResolverParams: GraphQLFieldResolverParams<unknown, RequestContext> = {
    source: undefined,
    args: {},
    context: {} as any,
    info: {} as any,
  };

  beforeEach(() => {
    nock.cleanAll();
    ds = new RESTDirectiveDataSource(fetch as any);
    ds.initialize({ context: emptyContext as any, cache: new InMemoryLRUCache() });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test.each(testCases)('%s', async (_, { setup, restParams, fieldResolverParams, shouldSkipRequest = false }) => {
    const fetchSpy = setup();
    try {
      const response = await ds.doRequest(
        { ...defaultRestParams, ...restParams },
        { ...defaultFieldResolverParams, ...fieldResolverParams }
      );
      expect(fetchSpy.isDone()).toBe(!shouldSkipRequest);
      expect(response).toBe(JSON.stringify('DATA'));
    } catch (e) {
      expect(e).toMatchSnapshot();
    }
  });
});
