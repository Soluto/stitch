import {RESTDataSource} from 'apollo-datasource-rest';
import {KeyValue, RestParams} from './types';
import {injectParameters, resolveParameters} from '../../param-injection';
import {RequestContext} from '../../context';
import {RequestInit, Headers, Request} from 'apollo-server-env';
import {GraphQLResolveInfo} from 'graphql';
import {getAuthHeaders} from '../../auth/getAuthHeaders';

type GraphQLArguments = {[key: string]: any};

export class RESTDirectiveDataSource extends RESTDataSource<RequestContext> {
    async doRequest(params: RestParams, parent: any, args: GraphQLArguments, info: GraphQLResolveInfo) {
        const headers = this.parseHeaders(params.headers, parent, args, info);
        const requestInit: RequestInit = {headers, timeout: params.timeoutMs ?? 10000, method: params.method};
        const url = new URL(injectParameters(params.url, parent, args, this.context, info));
        this.addQueryParams(url.searchParams, params.query, parent, args, info);

        const authHeaders = await getAuthHeaders(this.context.authenticationConfig, url.host, this.context.request);
        if (authHeaders != null) {
            headers.append('Authorization', authHeaders.Authorization);
        }

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

    parseHeaders(kvs: KeyValue[] | undefined, parent: any, args: GraphQLArguments, info: GraphQLResolveInfo) {
        const headers = new Headers();

        if (typeof kvs !== 'undefined') {
            for (const kv of kvs) {
                headers.append(kv.key, injectParameters(kv.value, parent, args, this.context, info));
            }
        }

        return headers;
    }

    addQueryParams(
        params: URLSearchParams,
        kvs: KeyValue[] | undefined,
        parent: any,
        args: GraphQLArguments,
        info: GraphQLResolveInfo
    ) {
        if (!kvs || kvs.length == 0) return;

        for (const kv of kvs) {
            const parameters = resolveParameters(kv.value, parent, args, this.context, info);
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
