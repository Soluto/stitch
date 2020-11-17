import { RESTDataSource, Request } from 'apollo-datasource-rest';
import { RequestInit, Headers } from 'apollo-server-env';
import { GraphQLResolveInfo, isNullableType } from 'graphql';
import { inject } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { getAuthHeaders } from '../../upstream-authentication';
import { KeyValue, RestParams } from './types';

type GraphQLArguments = { [key: string]: unknown };

export class RESTDirectiveDataSource extends RESTDataSource<RequestContext> {
  async doRequest(
    params: RestParams,
    parent: unknown,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
  ) {
    const headers = this.parseHeaders(params.headers, parent, args, info);
    const requestInit: RequestInit = { headers, timeout: params.timeoutMs ?? 10000, method: params.method };
    const url = new URL(inject(params.url, parent, args, this.context, info) as string);
    const validQueryParams = this.addQueryParams(url.searchParams, params.query, parent, args, info);
    if (!validQueryParams) {
      return null;
    }

    await this.addAuthentication(url, headers);

    const body = this.getBody(params, parent, args, context, info);
    if (body) {
      requestInit.body = JSON.stringify(body);
      headers.append('Content-Type', 'application/json');
    }

    const request = new Request(String(url), requestInit);
    const cacheKey = this.cacheKeyFor(request);
    const response = await this.httpCache.fetch(request, { cacheKey });

    const notFoundAsNull = params.notFoundAsNull ?? isNullableType(info.returnType);
    if (response.status === 404 && notFoundAsNull) {
      return null;
    }
    return this.didReceiveResponse(response, request);
  }

  private async addAuthentication(url: URL, headers: Headers) {
    const authHeaders = await getAuthHeaders(this.context.authenticationConfig, url.host, this.context.request);
    if (authHeaders != undefined) {
      headers.append('Authorization', authHeaders.Authorization);
    }
  }

  getBody(
    params: RestParams,
    parent: unknown,
    args: Record<string, unknown>,
    context: RequestContext,
    info: GraphQLResolveInfo
  ) {
    const { body, bodyArg } = params;
    if (body && bodyArg) {
      throw new Error('Set either "body" or "bodyArg" argument but not both');
    }
    if (body) {
      return inject(body, parent, args, context, info);
    }
    return args[params.bodyArg || 'input'] as ArrayBuffer | ArrayBufferView | string;
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
    let validQueryParams = true;

    if (!kvs || kvs.length == 0) return validQueryParams;

    for (const kv of kvs) {
      const value = inject(kv.value, parent, args, this.context, info);
      if (!value && kv.required) {
        validQueryParams = false;
        break;
      }
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
    return validQueryParams;
  }
}

declare module '../../context' {
  interface ContextDataSources {
    rest: RESTDirectiveDataSource;
  }
}
