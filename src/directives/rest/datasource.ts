import {RESTDataSource} from 'apollo-datasource-rest';
import {KeyValue, RestParams} from './types';
import {injectParameters, resolveParameters} from '../../param-injection';
import {RequestContext} from '../../context';
import {RequestInit, Headers} from 'apollo-server-env';

type GraphQLArguments = {[key: string]: any};

export class RESTDirectiveDataSource extends RESTDataSource<RequestContext> {
    doRequest(params: RestParams, parent: any, args: GraphQLArguments) {
        const headers = this.parseHeaders(params.headers, parent, args);
        const requestInit: RequestInit = {headers, timeout: params.timeoutMs};
        const body = params.bodyArg && args[params.bodyArg];
        const url = new URL(injectParameters(params.url, parent, args, this.context));
        this.addQueryParams(url.searchParams, params.query, parent, args);

        const method = params.method?.toUpperCase();

        switch (method) {
            default:
            case 'GET':
                return this.get(url.href, undefined, requestInit);
            case 'DELETE':
                return this.delete(url.href, undefined, requestInit);
            case 'POST':
                return this.post(url.href, body, requestInit);
            case 'PUT':
                return this.put(url.href, body, requestInit);
            case 'PATCH':
                return this.patch(url.href, body, requestInit);
        }
    }

    parseHeaders(kvs: KeyValue[] | undefined, parent: any, args: GraphQLArguments) {
        if (!kvs || kvs.length == 0) return;

        const headers = new Headers();

        for (const kv of kvs) {
            headers.append(kv.key, injectParameters(kv.value, parent, args, this.context));
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
