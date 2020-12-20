import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';
import { ResourceGroup } from '../resource-repository';
import { ActiveDirectoryAuth, getAuthHeaders } from './authentication';

export { ActiveDirectoryAuth };

export type RequestParams = {
  url: URL;
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  timeout?: number;
};

export async function applyUpstream(
  requestParams: RequestParams,
  resourceGroup: ResourceGroup,
  activeDirectoryAuth: ActiveDirectoryAuth,
  originalRequest?: Pick<FastifyRequest, 'headers'>
): Promise<RequestParams> {
  const headers = await getAuthHeaders(resourceGroup, activeDirectoryAuth, requestParams.url.host, originalRequest);
  return _.merge({}, requestParams, { headers });
}
