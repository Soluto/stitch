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
    decodeJWT(): Promise<void>;
    decodedJWT?: DecodedJWT | null;
  }
}

async function decodeRequestJwt(this: FastifyRequest) {
  try {
    const authHeader = this.headers.authorization;
    if (!authHeader) return;
    const authToken = String(authHeader).split(' ')[1];
    const maybeDecodedJWT = (await decode(authToken, { complete: true, json: true })) as DecodedJWT | null;
    if (maybeDecodedJWT) {
      this.decodedJWT = maybeDecodedJWT;
    }
  } catch (e) {
    logger.warn(e, 'Fail to extract and decode JWT from request');
  }
}

export default fp(async function (instance: FastifyInstance) {
  console.log('===== PLUGIN ENABLED =====');
  instance.decorateRequest('decodeJWT', decodeRequestJwt);
});
