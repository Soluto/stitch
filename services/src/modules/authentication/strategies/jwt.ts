import fastify from 'fastify';
import { decode } from 'jsonwebtoken';
import logger from '../../logger';
import { authenticationConfig } from '../../config';

export default async function (request: fastify.FastifyRequest): Promise<void> {
  const authHeader: string = request.headers.authorization;
  if (!authHeader) throw new Error('Unauthorized');
  const token = authHeader.split(' ')[1];
  const decodedToken = decode(token, { json: true }) as Record<string, unknown>;
  const issuer = String(decodedToken?.iss);
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
