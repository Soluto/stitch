import { RESTDataSource, Request, Response } from 'apollo-datasource-rest';
import { RequestInit, Headers } from 'apollo-server-env';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import {  GraphQLError, isNullableType } from 'graphql';
import { inject } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { applyUpstream } from '../../upstreams';
import { RestParams } from './types';

type FieldResolverParams = GraphQLFieldResolverParams<unknown, RequestContext, Record<string, unknown>>;

const hasValue = (value: unknown) =>
  value !== null && typeof value !== undefined && value !== undefined && value !== '';
export class RESTDirectiveDataSource extends RESTDataSource<RequestContext> {
  async doRequest(params: RestParams, fieldResolverParams: FieldResolverParams) {
    const { method, timeoutMs: timeout } = params;
    const requestInit: RequestInit = { method, timeout };
    this.setHeaders(requestInit, params, fieldResolverParams);
    this.setBody(requestInit, params, fieldResolverParams);
    const url = this.resolveUrl(params, fieldResolverParams);
    this.setQueryParams(url, params, fieldResolverParams);

    const request = new Request(String(url), requestInit);
    const upstreamRequest = this.buildRequest(url, requestInit);
    const cacheKey = this.cacheKeyFor(upstreamRequest);

    const response = await this.httpCache.fetch(request, { cacheKey });
    return this.handleResponse(upstreamRequest, response, params, fieldResolverParams);
  }

  private setHeaders(requestInit: RequestInit, params: RestParams, fieldResolverParams: FieldResolverParams) {
    const { headers: kvs } = params;
    const headers = new Headers();

    if (typeof kvs === 'undefined') {
      return;
    }

    for (const kv of kvs) {
      const value = inject(kv.value, fieldResolverParams) as string;
      if (!hasValue(value) && kv.required){
        throw new GraphQLError(`${kv.key} header is required`);
      }
      headers.append(kv.key, value);
    }
    requestInit.headers = headers;
  }

  private setBody(requestInit: RequestInit, params: RestParams, fieldResolverParams: FieldResolverParams) {
    const { body: bodyObj, bodyArg } = params;
    if (bodyObj && bodyArg) {
      throw new Error('Set either "body" or "bodyArg" argument but not both');
    }
    const body = bodyObj
      ? inject(bodyObj, fieldResolverParams)
      : fieldResolverParams.args[params.bodyArg || 'input'];
    if (body) {
      requestInit.body = JSON.stringify(body);
      if (!requestInit.headers) {
        requestInit.headers = new Headers();
      }
      (requestInit.headers as Headers).append('Content-Type', 'application/json');
    }
  }

  private resolveUrl(params: RestParams, fieldResolverParams: FieldResolverParams) {
    return new URL(inject(params.url, fieldResolverParams) as string);
  }

  private setQueryParams(url: URL, params: RestParams, fieldResolverParams: FieldResolverParams) {
    const { query: kvs } = params;
    if (!kvs || kvs.length == 0) return;

    for (const kv of kvs) {
      const value = inject(kv.value, fieldResolverParams);
      if (!hasValue(value)) {
        if (kv.required) {
          throw new GraphQLError(`${kv.key} query parameter is required`);
        }
        continue;
      }

      if (Array.isArray(value)) {
        for (const elem of value) {
          url.searchParams.append(kv.key, elem);
        }
      } else {
        url.searchParams.append(kv.key, String(value));
      }
    }
  }

  private handleResponse(
    request: Request,
    response: Response,
    params: RestParams,
    fieldResolverParams: FieldResolverParams
  ) {
    const notFoundAsNull = params.notFoundAsNull ?? isNullableType(fieldResolverParams.info.returnType);
    if (response.status === 404 && notFoundAsNull) {
      return null;
    }
    return this.didReceiveResponse(response, request);
  }

  private buildRequest(url: URL, requestInit: RequestInit) {
    applyUpstream(url, requestInit, this.context.authenticationConfig, this.context.request);
    return new Request(url.href, requestInit);
  }
}

declare module '../../context' {
  interface ContextDataSources {
    rest: RESTDirectiveDataSource;
  }
}
