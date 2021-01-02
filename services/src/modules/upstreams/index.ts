import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';
import { injectArgs } from '../arguments-injection';
import { DefaultUpstream, ResourceGroup, Upstream } from '../resource-repository';
import { ActiveDirectoryAuth, getAuthHeaders } from './authentication';

export { ActiveDirectoryAuth };

export type RequestParams = {
  url: URL;
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  timeout?: number;
};

const defaultDefaultUpstream: DefaultUpstream = {
  headers: [
    {
      name: 'Authorization',
      value: '{request?.headers?.["authorization"]}',
    },
  ],
};

function toUpstream(defaultUpstream: DefaultUpstream): Upstream {
  return {
    ...defaultUpstream,
    sourceHosts: [],
    metadata: {
      namespace: 'internal',
      name: 'default',
    },
  };
}

export async function applyUpstream(
  requestParams: RequestParams,
  resourceGroup: ResourceGroup,
  activeDirectoryAuth: ActiveDirectoryAuth,
  originalRequest?: Pick<FastifyRequest, 'headers'>
): Promise<RequestParams> {
  const upstream =
    resourceGroup.upstreams.find(
      u => u.host === requestParams.url.host || u.sourceHosts?.includes(requestParams.url.host)
    ) ?? toUpstream(resourceGroup.defaultUpstream ?? defaultDefaultUpstream);

  // Headers
  if (upstream.headers) {
    if (!requestParams.headers) requestParams.headers = {};

    for (const header of upstream.headers) {
      const headerValue = injectArgs(header.value, { request: originalRequest }) as string;
      requestParams.headers[header.name] = headerValue;
    }
  }

  // Authorization headers
  const headers = await getAuthHeaders(upstream, resourceGroup.upstreamClientCredentials, activeDirectoryAuth);

  // Replace origin
  if (upstream.targetOrigin) {
    const url = requestParams.url;
    requestParams.url = new URL(url.href.replace(url.origin, upstream.targetOrigin));
  }

  return _.merge({}, requestParams, { headers });
}
