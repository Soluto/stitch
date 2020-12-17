import { RequestInit } from 'apollo-server-env';
import { FastifyRequest } from 'fastify';
import { ResourceGroup } from '../resource-repository';
import { ActiveDirectoryAuth, getAuthHeaders } from './authentication';

export { ActiveDirectoryAuth, getAuthHeaders };

export async function applyUpstream(
  url: URL,
  requestInit: RequestInit,
  resourceGroup: ResourceGroup,
  activeDirectoryAuth: ActiveDirectoryAuth,
  originalRequest?: Pick<FastifyRequest, 'headers'>
) {
  const headers = await getAuthHeaders(resourceGroup, activeDirectoryAuth, url.host, originalRequest);
  requestInit.headers = { ...requestInit.headers, ...headers };
}
