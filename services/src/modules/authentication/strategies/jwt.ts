import * as fastify from 'fastify';
import logger from '../../logger';
import { authenticationConfig } from '../../config';

export default async function (request: fastify.FastifyRequest): Promise<void> {
  const decodedJWT = request.decodeJWT();
  if (!decodedJWT) throw new Error('Unauthorized');
  const issuer = String(decodedJWT.payload.iss);
  const issuerConfig = authenticationConfig?.jwt?.[issuer];
  if (!issuerConfig) {
    logger.debug({ issuer }, 'Unknown issuer');
    throw new Error('Unauthorized');
  }
  if (issuerConfig.authenticatedPaths.some(ap => request.raw.url === ap)) {
    try {
      await request.jwtVerify();
    } catch (error) {
      logger.debug(error, 'Failed to verify request JWT');
      throw new Error('Unauthorized');
    }
  }
}
