import * as fastify from 'fastify';
import logger from '../../logger';
import { authenticationConfig } from '../../config';

export default async function (request: fastify.FastifyRequest): Promise<void> {
  await request.decodeJWT();
  if (!request.decodedJWT) throw new Error('Unauthorized');
  const issuer = String(request.decodedJWT.payload.iss);
  const issuerConfig = authenticationConfig?.jwt?.[issuer];
  if (!issuerConfig) {
    logger.warn({ issuer }, 'Unknown issuer');
    throw new Error('Unauthorized');
  }
  if (issuerConfig.authenticatedPaths.some(ap => request.raw.url?.endsWith(ap))) {
    try {
      await request.jwtVerify();
    } catch (error) {
      logger.warn(error, 'Failed to verify request JWT');
      throw new Error('Unauthorized');
    }
  }
}
