import 'jest-fetch-mock';
import {RESTDirectiveDataSource} from './datasource';
import {InMemoryLRUCache} from 'apollo-server-caching';

describe('REST directive data source', () => {
    let ds: RESTDirectiveDataSource;

    beforeEach(() => {
        fetchMock.resetMocks();
        ds = new RESTDirectiveDataSource(fetchMock as any);
        ds.initialize({context: {} as any, cache: new InMemoryLRUCache()});
    });

    it('Defaults to GET', async () => {
        await ds.doRequest({url: 'http://somewhere'}, null, {});

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
            {name: 'aviv'}
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
            {name: 'aviv'}
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const req = fetchMock.mock.calls[0][0] as Request;
        expect(req.headers).toStrictEqual(new Headers({mykey: 'myvalue', owner: 'aviv'}));
        expect(req.url).toBe('http://somewhere/');
        expect(req.method).toBe('GET');
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
                    {}
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
            {input: {name: 'aviv'}}
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const req = fetchMock.mock.calls[0][0] as Request;
        expect(req.url).toBe('http://somewhere/');
        expect(req.method).toBe('POST');
        expect(await req.text()).toBe('{"name":"aviv"}');
    });
});
