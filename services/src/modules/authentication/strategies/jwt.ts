import * as fastify from 'fastify';
import * as _ from 'lodash';
import logger from '../../logger';
import { authenticationConfig } from '../../config';

export default async function (request: fastify.FastifyRequest): Promise<void> {
  const decodedJWT = request.decodeJWT();
  if (!decodedJWT) throw new Error('Unauthorized');

  // Verify issuer
  const issuer = String(decodedJWT.payload.iss);
  const reqLogger = logger.child({ issuer });

  const issuerConfig = authenticationConfig?.jwt?.[issuer];
  if (!issuerConfig) {
    reqLogger.debug('Unknown issuer');
    throw new Error('Unauthorized');
  }

  // Verify audience
  if (issuerConfig.audience) {
    const jwtAudiences = Array.isArray(decodedJWT.payload.aud)
      ? decodedJWT.payload.aud.map(a => String(a))
      : Array.of(String(decodedJWT.payload.aud));
    const configAudiences = Array.isArray(issuerConfig.audience)
      ? issuerConfig.audience
      : Array.of(issuerConfig.audience);

    const intersection = _.intersection(configAudiences, jwtAudiences);
    if (intersection.length === 0) {
      reqLogger.debug({ audience: decodedJWT.payload.aud }, 'Unexpected audience');
      throw new Error('Unauthorized');
    }
  }

  // Verify route
  const url = request.raw.url;
  if (!url || !issuerConfig.authenticatedPaths.includes(url)) {
    reqLogger.trace({ url }, 'Unexpected path');
    throw new Error('Unauthorized');
  }

  try {
    // Verify JWT signing, expiration and more
    await request.jwtVerify();
    reqLogger.trace('JWT verified');
  } catch (err) {
    reqLogger.debug({ err }, 'Failed to verify request JWT');
    throw new Error('Unauthorized');
  }
}
