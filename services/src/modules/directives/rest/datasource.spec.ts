import 'jest-fetch-mock';
import {InMemoryLRUCache} from 'apollo-server-caching';
import {RESTDirectiveDataSource} from './datasource';
jest.mock('../../logger');

const emptyContext = {
    authenticationConfig: {
        getUpstreamByHost() {},
    },
    request: {headers: {}},
};
describe('REST directive data source', () => {
    let ds: RESTDirectiveDataSource;

    beforeEach(() => {
        fetchMock.resetMocks();
        ds = new RESTDirectiveDataSource(fetchMock as any);
        ds.initialize({context: emptyContext as any, cache: new InMemoryLRUCache()});
    });

    it('Defaults to GET', async () => {
        await ds.doRequest({url: 'http://somewhere'}, null, {}, {} as any);

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
                    {key: 'mykey', value: 'myvalue'},
                    {key: 'owner', value: '{args.name}'},
                    {key: 'child', value: '{source.children}'},
                ],
            },
            {children: ['one', 'two', 3]},
            {name: 'aviv'},
            {} as any
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
                    {key: 'mykey', value: 'myvalue'},
                    {key: 'owner', value: '{args.name}'},
                ],
            },
            null,
            {name: 'aviv'},
            {} as any
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const req = fetchMock.mock.calls[0][0] as Request;
        expect(req.headers).toStrictEqual(new Headers({mykey: 'myvalue', owner: 'aviv'}));
        expect(req.url).toBe('http://somewhere/');
        expect(req.method).toBe('GET');
    });

    it('Skips headers and query params who resolve to undefined', async () => {
        await ds.doRequest(
            {
                url: 'http://somewhere',
                query: [{key: 'name', value: '{source.firstName}'}],
                headers: [{key: 'name', value: '{source.firstName}'}],
            },
            {firstName: undefined},
            {},
            {} as any
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const req = fetchMock.mock.calls[0][0] as Request;
        expect(req.url).toBe('http://somewhere/');
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
                    null,
                    {},
                    {} as any
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
            null,
            {input: {name: 'aviv'}},
            {} as any
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const req = fetchMock.mock.calls[0][0] as Request;
        expect(req.url).toBe('http://somewhere/');
        expect(req.method).toBe('POST');
        expect(req.headers.get('Content-Type')).toBe('application/json');
        expect(await req.text()).toBe('{"name":"aviv"}');
    });
});
