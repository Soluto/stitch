import { RequestInit } from 'apollo-server-env';
import { FastifyRequest } from 'fastify';
import { AuthenticationConfig, getAuthHeaders } from './authentication';

export async function applyUpstream(
  url: URL,
  requestInit: RequestInit,
  authConfig: AuthenticationConfig,
  originalRequest?: Pick<FastifyRequest, 'headers'>
) {
  const headers = await getAuthHeaders(authConfig, url.host, originalRequest);
  requestInit.headers = { ...requestInit.headers, ...headers };
}
