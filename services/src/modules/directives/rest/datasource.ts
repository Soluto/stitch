import { RESTDataSource, Request } from 'apollo-datasource-rest';
import { RequestInit, Headers } from 'apollo-server-env';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import {  GraphQLError, isNullableType } from 'graphql';
import { inject } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { getAuthHeaders } from '../../upstream-authentication';
import { KeyValue, RestParams } from './types';

const hasValue = (value: unknown) => value !== null && typeof value !== undefined && value !== undefined && value !== '';

export class RESTDirectiveDataSource extends RESTDataSource<RequestContext> {
  async doRequest(
    params: RestParams,
    fieldResolverParams: GraphQLFieldResolverParams<unknown, RequestContext>
  ) {
    const headers = this.parseHeaders(params.headers, fieldResolverParams);
    const requestInit: RequestInit = { headers, timeout: params.timeoutMs ?? 10000, method: params.method };
    const url = new URL(inject(params.url, fieldResolverParams) as string);
    this.addQueryParams(url.searchParams, params.query, fieldResolverParams);

    await this.addAuthentication(url, headers);

    const body = this.getBody(params, fieldResolverParams);
    if (body) {
      requestInit.body = JSON.stringify(body);
      headers.append('Content-Type', 'application/json');
    }

    const request = new Request(String(url), requestInit);
    const cacheKey = this.cacheKeyFor(request);
    const response = await this.httpCache.fetch(request, { cacheKey });

    const notFoundAsNull = params.notFoundAsNull ?? isNullableType(fieldResolverParams.info.returnType);
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
    fieldResolverParams: GraphQLFieldResolverParams<unknown, RequestContext>
  ) {
    const { body, bodyArg } = params;
    if (body && bodyArg) {
      throw new Error('Set either "body" or "bodyArg" argument but not both');
    }
    if (body) {
      return inject(body, fieldResolverParams);
    }
    return fieldResolverParams.args[params.bodyArg || 'input'] as ArrayBuffer | ArrayBufferView | string;
  }

  parseHeaders(kvs: KeyValue[] | undefined, fieldResolverParams: GraphQLFieldResolverParams<unknown, RequestContext>) {
    const headers = new Headers();

    if (typeof kvs === 'undefined') {
      return headers;
    }

    for (const kv of kvs) {
      const value = inject(kv.value, fieldResolverParams) as string;
      if (!hasValue(value) && kv.required){
        throw new GraphQLError(`${kv.key} header is required`);
      }
      headers.append(kv.key, value);
    }

    return headers;
  }

  addQueryParams(
    params: URLSearchParams,
    kvs: KeyValue[] | undefined,
    fieldResolverParams: GraphQLFieldResolverParams<unknown, RequestContext>
  ) {

    if (!kvs || kvs.length == 0) return;

    for (const kv of kvs) {
      const value = inject(kv.value, fieldResolverParams);
      if (!hasValue(value)) {
        if(kv.required) {
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
