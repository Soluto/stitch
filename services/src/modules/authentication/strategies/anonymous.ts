import { IncomingHttpHeaders } from 'http';
import { URL } from 'url';
import { authenticationConfig } from '../../config';

export interface AnonymousAuthPartialRequest {
  headers?: IncomingHttpHeaders;
  raw: {
    url?: string;
  };
  _isAnonymousAccess?: boolean;
}

export default async function (request: AnonymousAuthPartialRequest) {
  const config = authenticationConfig?.anonymous;
  if (!config) throw new Error('Unauthorized');
  if (config.rejectAuthorizationHeader && request.headers?.authorization) {
    throw new Error('Unauthorized');
  }

  const anonymousPaths = config.publicPaths;
  if (!anonymousPaths) throw new Error('Unauthorized');

  const url = new URL(request.raw.url ?? '', 'https://localhost:80');
  const isAnonymous = anonymousPaths.includes(url.pathname);
  if (!isAnonymous) throw new Error('Unauthorized');

  request._isAnonymousAccess = true;
}
