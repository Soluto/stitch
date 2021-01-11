import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';
import { injectArgs } from '../arguments-injection';
import { DefaultUpstream, ResourceGroup, ResourceMetadata, Upstream } from '../resource-repository';
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
      value: '{incomingRequest?.headers?.["authorization"]}',
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
  incomingRequest?: Partial<Pick<FastifyRequest, 'headers' | 'decodeJWT'>>
): Promise<RequestParams> {
  const upstream =
    getUpstream(requestParams.url.host, resourceGroup.upstreams) ??
    toUpstream(resourceGroup.defaultUpstream ?? defaultDefaultUpstream);

  // Headers
  if (upstream.headers) {
    // original outgoing request as build from directive arguments before upstream changes.
    const outgoingRequest = _.cloneDeep(requestParams);

    const jwt = incomingRequest?.decodeJWT?.();

    if (!requestParams.headers) requestParams.headers = {};

    for (const header of upstream.headers) {
      const headerValue = injectArgs(header.value, { incomingRequest, outgoingRequest, jwt }) as string;
      if (!headerValue) continue;
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

function getUpstream(host: string, upstreams: Upstream[]) {
  const upstream = upstreams.find(u => u.host === host || u.sourceHosts?.includes(host));
  if (!upstream) return;

  if (upstream.fromTemplate) {
    const upstreamTemplate = getUpstreamTemplate(upstream.fromTemplate, upstreams);
    return { ...upstreamTemplate, ...upstream };
  }
  return upstream;
}

function getUpstreamTemplate(metadata: ResourceMetadata, upstreams: Upstream[]): Upstream | undefined {
  const upstream = upstreams.find(u => _.isEqual(u.metadata, metadata));
  if (upstream?.fromTemplate) {
    const upstreamTemplate = getUpstreamTemplate(upstream.fromTemplate, upstreams);
    return { ...upstreamTemplate, ...upstream };
  }
  return upstream;
}
