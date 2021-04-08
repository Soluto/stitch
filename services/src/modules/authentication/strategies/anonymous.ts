import { FastifyRequest } from 'fastify';
import { authenticationConfig } from '../../config';

export default async function (request: FastifyRequest): Promise<void> {
  const config = authenticationConfig?.anonymous;
  if (!config) throw new Error('Unauthorized');
  if (config.rejectAuthorizationHeader && request.headers.authorization) {
    throw new Error('Unauthorized');
  }

  const anonymousPaths = config.publicPaths;
  if (!anonymousPaths) throw new Error('Unauthorized');
  if (!anonymousPaths.some(ap => request.raw.url?.endsWith(ap))) {
    throw new Error('Unauthorized');
  }
  request._isAnonymousAccess = true;
}
