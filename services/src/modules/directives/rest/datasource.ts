import { RESTDataSource, Request } from 'apollo-datasource-rest';
import { RequestInit, Headers } from 'apollo-server-env';
import { GraphQLError, GraphQLResolveInfo, isNullableType } from 'graphql';
import { inject } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { Upstream } from '../../resource-repository';
import { getAuthHeaders } from '../../upstream-authentication';
import { KeyValue, RestParams } from './types';

const hasValue = (value: unknown) =>
  value !== null && typeof value !== undefined && value !== undefined && value !== '';

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

    let url = new URL(inject(params.url, parent, args, this.context, info) as string);

    const upstream = this.context.authenticationConfig.getUpstreamByHost(url.host);
    if (upstream?.origin) {
      url = new URL(url.href.replace(url.origin, upstream.origin));
    }

    this.addQueryParams(url.searchParams, params.query, parent, args, info);

    if (upstream && upstream.auth) {
      await this.addAuthentication(upstream, headers);
    }

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

  private async addAuthentication(upstream: Upstream, headers: Headers) {
    const authHeaders = await getAuthHeaders(upstream, this.context.authenticationConfig, this.context.request);
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
      if (!hasValue(value) && kv.required) {
        throw new GraphQLError(`${kv.key} header is required`);
      }
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
      if (!hasValue(value)) {
        if (kv.required) {
          throw new GraphQLError(`${kv.key} query parameter is required`);
        }
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
