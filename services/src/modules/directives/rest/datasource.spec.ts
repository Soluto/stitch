import 'jest-fetch-mock';
import { InMemoryLRUCache } from 'apollo-server-caching';
import { RESTDirectiveDataSource } from './datasource';

jest.mock('../../logger');

const emptyContext = {
  authenticationConfig: {
    getUpstreamByHost() {},
  },
  request: { headers: {} },
};
describe('REST directive data source', () => {
  let ds: RESTDirectiveDataSource;

  beforeEach(() => {
    fetchMock.resetMocks();
    ds = new RESTDirectiveDataSource(fetchMock as any);
    ds.initialize({ context: emptyContext as any, cache: new InMemoryLRUCache() });
  });

  it('Defaults to GET', async () => {
    await ds.doRequest(
      { url: 'http://somewhere' },
      {
        source: null,
        args: {},
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toBe('http://somewhere/');
    expect(req.method).toBe('GET');
  });

  it('Includes query parameters, static ones & from params & arrays from params', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        query: [
          { key: 'mykey', value: 'myvalue' },
          { key: 'owner', value: '{args.name}' },
          { key: 'child', value: '{source.children}' },
        ],
      },
      {
        source: { children: ['one', 'two', 3] },
        args: { name: 'aviv' },
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toBe('http://somewhere/?mykey=myvalue&owner=aviv&child=one&child=two&child=3');
  });

  it('Includes headers', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        headers: [
          { key: 'mykey', value: 'myvalue' },
          { key: 'owner', value: '{args.name}' },
        ],
      },
      {
        source: null,
        args: { name: 'aviv' },
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.headers).toStrictEqual(new Headers({ mykey: 'myvalue', owner: 'aviv' }));
    expect(req.url).toBe('http://somewhere/');
    expect(req.method).toBe('GET');
  });

  it('Skips headers and query params who resolve to undefined', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        query: [{ key: 'name', value: '{source.firstName}' }],
        headers: [{ key: 'name', value: '{source.firstName}' }],
      },
      {
        source: { firstName: undefined },
        args: {},
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toBe('http://somewhere/');
  });

  it('Sends request if required headers are included', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        headers: [
          { key: 'mykey', value: 'myvalue', required: true },
          { key: 'owner', value: '{args.name}' },
        ],
      },
      {
        source: null,
        args: { name: 'aviv' },
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.headers.get('mykey')).toBe('myvalue');
    expect(req.headers.get('owner')).toBe('aviv');
  });

  it('Does not send request if required headers are empty', async () => {
    try {
      await ds.doRequest(
        {
          url: 'http://somewhere',
          headers: [
            { key: 'mykey', value: '', required: true },
            { key: 'owner', value: '{args.name}' },
          ],
        },
        {
          source: null,
          args: { name: 'aviv' },
          context: {} as any,
          info: {} as any,
        }
      );
    } catch (err) {
      expect(err.toString()).toBe('mykey header is required');
    }
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('Sends request when header is missing the value and required is not set (default false)', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        headers: [
          { key: 'mykey', value: '' },
          { key: 'owner', value: '{args.name}' },
        ],
      },
      {
        source: null,
        args: { name: 'aviv' },
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.headers.get('mykey')).toBe('');
    expect(req.headers.get('owner')).toBe('aviv');
  });

  describe('Supported http methods dispatch with the correct http method', () => {
    const methods = ['GET', 'DELETE', 'POST', 'PUT', 'PATCH'];

    for (const method of methods) {
      it(method, async () => {
        await ds.doRequest(
          {
            url: 'http://somewhere',
            method,
          },
          {
            source: null,
            args: {},
            context: {} as any,
            info: {} as any,
          }
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const req = fetchMock.mock.calls[0][0] as Request;
        expect(req.method).toBe(method);
      });
    }
  });

  it('Adds stringified JSON body', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        method: 'POST',
        bodyArg: 'input',
      },
      {
        source: null,
        args: { input: { name: 'aviv' } },
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toBe('http://somewhere/');
    expect(req.method).toBe('POST');
    expect(req.headers.get('Content-Type')).toBe('application/json');
    expect(await req.text()).toBe('{"name":"aviv"}');
  });

  it('Sends request if required query parameters are included', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        method: 'GET',
        query: [{ key: 'field1', value: 'value1', required: true }],
      },
      {
        source: null,
        args: {},
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toBe('http://somewhere/?field1=value1');
    expect(req.method).toBe('GET');
  });

  it('Does not send request if required query parameters are missing values', async () => {
    try {
      await ds.doRequest(
        {
          url: 'http://somewhere',
          method: 'GET',
          query: [{ key: 'field1', value: '', required: true }],
        },
        {
          source: null,
          args: {},
          context: {} as any,
          info: {} as any,
        }
      );
    } catch (err) {
      expect(err.toString()).toBe('field1 query parameter is required');
    }
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('Properly handles boolean query parameter values', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        method: 'GET',
        query: [{ key: 'field1', value: 'false', required: true }],
      },
      {
        source: null,
        args: {},
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toBe('http://somewhere/?field1=false');
  });

  it('Sends request when empty values are sent in the query params and required is not set (default false)', async () => {
    await ds.doRequest(
      {
        url: 'http://somewhere',
        method: 'GET',
        query: [{ key: 'field1', value: '' }],
      },
      {
        source: null,
        args: {},
        context: {} as any,
        info: {} as any,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toBe('http://somewhere/');
  });
});
