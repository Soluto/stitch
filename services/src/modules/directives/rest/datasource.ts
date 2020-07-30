import { RESTDataSource } from 'apollo-datasource-rest';
import { RequestInit, Headers, Request } from 'apollo-server-env';
import { GraphQLResolveInfo } from 'graphql';
import { inject } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { getAuthHeaders } from '../../upstream-authentication';
import { KeyValue, RestParams } from './types';

type GraphQLArguments = { [key: string]: unknown };

export class RESTDirectiveDataSource extends RESTDataSource<RequestContext> {
  async doRequest(params: RestParams, parent: unknown, args: GraphQLArguments, info: GraphQLResolveInfo) {
    const headers = this.parseHeaders(params.headers, parent, args, info);
    const requestInit: RequestInit = { headers, timeout: params.timeoutMs ?? 10000, method: params.method };
    const url = new URL(inject(params.url, parent, args, this.context, info));
    this.addQueryParams(url.searchParams, params.query, parent, args, info);

    const authHeaders = await getAuthHeaders(this.context.authenticationConfig, url.host, this.context.request);
    if (authHeaders != undefined) {
      headers.append('Authorization', authHeaders.Authorization);
    }

    requestInit.body = args[params.bodyArg || 'input'] as ArrayBuffer | ArrayBufferView | string;
    if (requestInit.body) {
      requestInit.body = JSON.stringify(requestInit.body);
      headers.append('Content-Type', 'application/json');
    }

    const request = new Request(String(url), requestInit);
    const cacheKey = this.cacheKeyFor(request);
    const response = await this.httpCache.fetch(request, { cacheKey });

    return this.didReceiveResponse(response, request);
  }

  parseHeaders(kvs: KeyValue[] | undefined, parent: unknown, args: GraphQLArguments, info: GraphQLResolveInfo) {
    const headers = new Headers();

    if (typeof kvs === 'undefined') {
      return headers;
    }

    for (const kv of kvs) {
      const value = inject(kv.value, parent, args, this.context, info) as string;
      headers.append(kv.key, value);
    }

    return headers;
  }

  addQueryParams(
    params: URLSearchParams,
    kvs: KeyValue[] | undefined,
    parent: unknown,
    args: GraphQLArguments,
    info: GraphQLResolveInfo
  ) {
    if (!kvs || kvs.length == 0) return;

    for (const kv of kvs) {
      const value = inject(kv.value, parent, args, this.context, info);
      if (!value) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const elem of value) {
          params.append(kv.key, elem);
        }
      } else {
        params.append(kv.key, String(value));
      }
    }
  }
}

declare module '../../context' {
  interface ContextDataSources {
    rest: RESTDirectiveDataSource;
  }
}
