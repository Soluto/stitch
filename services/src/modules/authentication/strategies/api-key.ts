import { IncomingHttpHeaders } from 'http';
import logger, { createChildLogger } from '../../logger';
import { authenticationConfig } from '../../config';

export interface ApiKeyAuthPartialRequest {
  headers: IncomingHttpHeaders;
  query: unknown;
  raw: {
    url?: string;
  };
}

export default async function (request: ApiKeyAuthPartialRequest) {
  const config = authenticationConfig.apiKey;
  if (!config) throw new Error('Unauthorized');
  const apiKeys = config.keys;

  const apiKey = ((config.header && request.headers[config.header]) ||
    (config.queryParam && (request.query as { [key: string]: unknown })[config.queryParam])) as string;
  if (!apiKey) throw new Error('Unauthorized');

  const reqLogger = createChildLogger(logger, 'auth-strategy-api-key', {
    apiKey: apiKey.replace(/(.{2}).+(.{2})/, '$1***$2'),
  });
  reqLogger.trace('Api key found in request');

  const apiKeyConfig = apiKeys[apiKey];
  if (!apiKeyConfig) {
    reqLogger.debug('Unexpected api key');
    throw new Error('Unauthorized');
  }
  reqLogger.trace({ name: apiKeyConfig.name }, 'Api key found in configuration');

  if (apiKeyConfig.disabled) {
    reqLogger.debug('The api key is disabled');
    throw new Error('Unauthorized');
  }

  const paths = config.authenticatedPaths;
  if (!paths) throw new Error('Unauthorized');
  if (!request.raw.url || !paths.includes(request.raw.url)) {
    throw new Error('Unauthorized');
  }
}
