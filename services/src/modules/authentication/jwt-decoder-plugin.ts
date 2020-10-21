import * as http from 'http';
import { decode } from 'jsonwebtoken';
import { FastifyRequest, FastifyInstance } from 'fastify';
import * as fp from 'fastify-plugin';
import logger from '../logger';

type DecodedJWT = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
};

declare module 'fastify' {
  interface FastifyRequest<
    HttpRequest = http.IncomingMessage,
    Query = DefaultQuery,
    Params = DefaultParams,
    Headers = DefaultHeaders,
    Body = DefaultBody
  > {
    decodeJWT(): DecodedJWT | undefined;
    _decodedJWT?: DecodedJWT | null;
  }
}

function decodeRequestJwt(this: FastifyRequest) {
  if (this._decodedJWT) return this._decodedJWT;
  try {
    const authHeader = this.headers.authorization;
    if (!authHeader) return;
    const authToken = String(authHeader).split(' ')[1];
    const maybeDecodedJWT = decode(authToken, { complete: true, json: true }) as DecodedJWT | null;
    if (maybeDecodedJWT) {
      this._decodedJWT = maybeDecodedJWT;
      return this._decodedJWT;
    }
    return;
  } catch (e) {
    logger.debug(e, 'Fail to extract and decode JWT from request');
    return;
  }
}

export default fp(async function (instance: FastifyInstance) {
  instance.decorateRequest('decodeJWT', decodeRequestJwt);
});
