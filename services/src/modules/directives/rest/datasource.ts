import { RESTDataSource, Request, Response } from 'apollo-datasource-rest';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { RequestInit } from 'apollo-server-env';
import { GraphQLError, isNullableType } from 'graphql';
import { inject } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { applyUpstream, RequestParams } from '../../upstreams';
import { RestParams } from './types';

type FieldResolverParams = GraphQLFieldResolverParams<unknown, RequestContext, Record<string, unknown>>;

const hasValue = (value: unknown) =>
  value !== null && typeof value !== undefined && value !== undefined && value !== '';
export class RESTDirectiveDataSource extends RESTDataSource<RequestContext> {
  async doRequest(params: RestParams, fieldResolverParams: FieldResolverParams) {
    const { url, method, timeoutMs: timeout } = params;
    const requestParams: RequestParams = { url: new URL(url), method, timeout };
    this.setHeaders(requestParams, params, fieldResolverParams);
    this.setBody(requestParams, params, fieldResolverParams);
    this.resolveUrl(requestParams, params, fieldResolverParams);
    this.setQueryParams(requestParams, params, fieldResolverParams);

    const request = await this.buildRequest(requestParams);
    const cacheKey = this.cacheKeyFor(request);

    const response = await this.httpCache.fetch(request, { cacheKey });
    return this.handleResponse(request, response, params, fieldResolverParams);
  }

  private setHeaders(requestParams: RequestParams, params: RestParams, fieldResolverParams: FieldResolverParams) {
    const { headers: kvs } = params;
    const headers: Record<string, string> = {};

    if (kvs) {
      for (const kv of kvs) {
        const value = inject(kv.value, fieldResolverParams) as string;
        if (!hasValue(value) && kv.required) {
          throw new GraphQLError(`${kv.key} header is required`);
        }
        headers[kv.key] = value;
      }
    }

    requestParams.headers = headers;
  }

  private setBody(requestParams: RequestParams, params: RestParams, fieldResolverParams: FieldResolverParams) {
    if (!requestParams.method || ['GET', 'HEAD'].includes(requestParams.method.toUpperCase())) {
      return;
    }
    const { body: bodyObj, bodyArg } = params;
    if (bodyObj && bodyArg) {
      throw new Error('Set either "body" or "bodyArg" argument but not both');
    }
    const body = bodyObj ? inject(bodyObj, fieldResolverParams) : fieldResolverParams.args[params.bodyArg || 'input'];
    if (body) {
      requestParams.body = JSON.stringify(body);
      requestParams.headers!['Content-Type'] = 'application/json';
    }
  }

  private resolveUrl(requestParams: RequestParams, params: RestParams, fieldResolverParams: FieldResolverParams) {
    requestParams.url = new URL(inject(params.url, fieldResolverParams) as string);
  }

  private setQueryParams(requestParams: RequestParams, params: RestParams, fieldResolverParams: FieldResolverParams) {
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
          requestParams.url.searchParams.append(kv.key, elem);
        }
      } else if (typeof value === 'object' && Object.prototype.toString.call(value) !== '[object Date]') {
        requestParams.url.searchParams.append(kv.key, JSON.stringify(value));
      } else {
        requestParams.url.searchParams.append(kv.key, String(value));
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

  private async buildRequest(requestParams: RequestParams) {
    const { url, ...requestInit } = await applyUpstream(
      requestParams,
      this.context.resourceGroup,
      this.context.activeDirectoryAuth,
      this.context.request
    );
    return new Request(url!.href, requestInit as RequestInit);
  }
}

declare module '../../context' {
  interface ContextDataSources {
    rest: RESTDirectiveDataSource;
  }
}
