import { decode } from 'jsonwebtoken';
import { FastifyRequest, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import logger from '../logger';

export type DecodedJWT = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    decodeJWT(): DecodedJWT | undefined;
    _decodedJWT?: DecodedJWT | null;
  }
}

function decodeRequestJwt(this: FastifyRequest) {
  if (this._decodedJWT) return this._decodedJWT;
  try {
    const authHeader = this.headers.authorization;
    if (!authHeader) return;
    const [authScheme, authToken] = String(authHeader).split(' ');
    if (authScheme != 'Bearer') return;
    const maybeDecodedJWT = decode(authToken, { complete: true, json: true }) as DecodedJWT | null;
    if (maybeDecodedJWT) {
      this._decodedJWT = maybeDecodedJWT;
      return this._decodedJWT;
    }
    return;
  } catch (e) {
    logger.debug(e as Error, 'Fail to extract and decode JWT from request');
    return;
  }
}

export default fp(async function (instance: FastifyInstance) {
  instance.decorateRequest('decodeJWT', decodeRequestJwt);
});
