import * as fastify from 'fastify';
import logger from '../../logger';
import { authenticationConfig } from '../../config';

export default async function (request: fastify.FastifyRequest): Promise<void> {
  const decodedJWT = request.decodeJWT();
  if (!decodedJWT) throw new Error('Unauthorized');

  // Verify issuer
  const issuer = String(decodedJWT.payload.iss);
  const issuerConfig = authenticationConfig?.jwt?.[issuer];
  if (!issuerConfig) {
    logger.debug({ issuer }, 'Unknown issuer');
    throw new Error('Unauthorized');
  }

  // Verify audience
  if (issuerConfig.audience) {
    const audience = Array.isArray(decodedJWT.payload.aud)
      ? decodedJWT.payload.aud.map(a => String(a))
      : Array.of(String(decodedJWT.payload.aud));
    if (!audience.includes(issuerConfig.audience)) {
      logger.debug({ issuer, audience: decodedJWT.payload.aud }, 'Unexpected audience');
      throw new Error('Unauthorized');
    }
  }

  // Verify route
  if (issuerConfig.authenticatedPaths.some(ap => request.raw.url === ap)) {
    try {
      // Verify JWT signing, expiration and more
      await request.jwtVerify();
      logger.trace({ issuer }, 'JWT verified');
    } catch (error) {
      logger.debug(error, 'Failed to verify request JWT');
      throw new Error('Unauthorized');
    }
  }
}
