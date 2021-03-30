import * as fastify from 'fastify';
import logger from '../../logger';
import { authenticationConfig } from '../../config';

export default async function (request: fastify.FastifyRequest): Promise<void> {
  const config = authenticationConfig.apiKey;
  if (!config) throw new Error('Unauthorized');
  const apiKeys = config.keys;

  let apiKey = '';
  const headerName = config.header;
  if (headerName) {
    apiKey = request.headers[headerName] as string;
  }
  if (!apiKey) {
    const queryParamName = config.queryParam;
    if (queryParamName) {
      apiKey = request.query[queryParamName] as string;
    }
  }
  if (!apiKey) {
    throw new Error('Unauthorized');
  }
  const reqLogger = logger.child({ apiKey: apiKey.replace(/(.{2}).+(.{2})/, '$1***$2') });
  reqLogger.trace('Api key found in request');

  const apiKeyConfig = apiKeys[apiKey];
  if (!apiKeyConfig) {
    reqLogger.debug('Unexpected api key');
    throw new Error('Unauthorized');
  }
  reqLogger.trace({ name: apiKeyConfig.name }, 'Api key found in configuration');

  if (apiKeyConfig.enabled === false) {
    reqLogger.debug('The api key is disabled');
    throw new Error('Unauthorized');
  }

  const anonymousPaths = config.authenticatedPaths;
  if (!anonymousPaths) throw new Error('Unauthorized');
  if (!request.raw.url || !anonymousPaths.includes(request.raw.url)) {
    throw new Error('Unauthorized');
  }
}
