import {RESTDataSource} from 'apollo-datasource-rest';
import {KeyValue, RestParams} from './types';
import {injectParameters, resolveParameters} from '../../param-injection';
import {RequestContext} from '../../context';
import {RequestInit, Headers, Request} from 'apollo-server-env';

type GraphQLArguments = {[key: string]: any};

export class RESTDirectiveDataSource extends RESTDataSource<RequestContext> {
    async doRequest(params: RestParams, parent: any, args: GraphQLArguments) {
        const headers = this.parseHeaders(params.headers, parent, args);
        const requestInit: RequestInit = {headers, timeout: params.timeoutMs, method: params.method};
        const url = new URL(injectParameters(params.url, parent, args, this.context));
        this.addQueryParams(url.searchParams, params.query, parent, args);

        requestInit.body = args[params.bodyArg || 'input'];
        if (requestInit.body) {
            requestInit.body = JSON.stringify(requestInit.body);
            headers.append('Content-Type', 'application/json');
        }

        const request = new Request(String(url), requestInit);
        const cacheKey = this.cacheKeyFor(request);
        const response = await this.httpCache.fetch(request, {cacheKey});

        return this.didReceiveResponse(response, request);
    }

    parseHeaders(kvs: KeyValue[] | undefined, parent: any, args: GraphQLArguments) {
        const headers = new Headers();

        if (typeof kvs !== 'undefined') {
            for (const kv of kvs) {
                headers.append(kv.key, injectParameters(kv.value, parent, args, this.context));
            }
        }

        return headers;
    }

    addQueryParams(params: URLSearchParams, kvs: KeyValue[] | undefined, parent: any, args: GraphQLArguments) {
        if (!kvs || kvs.length == 0) return;

        for (const kv of kvs) {
            const parameters = resolveParameters(kv.value, parent, args, this.context);
            if (!parameters) {
                params.append(kv.key, kv.value);
                continue;
            }

            for (const originalValue in parameters) {
                const paramValue = parameters[originalValue];
                if (Array.isArray(paramValue)) {
                    for (const elem of paramValue) {
                        params.append(kv.key, elem);
                    }
                } else {
                    params.append(kv.key, paramValue);
                }
            }
        }
    }
}

declare module '../../context' {
    interface ContextDataSources {
        rest: RESTDirectiveDataSource;
    }
}
