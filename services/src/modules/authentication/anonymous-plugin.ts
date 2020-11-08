import * as http from 'http';
import { FastifyRequest, FastifyInstance } from 'fastify';
import * as fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest<
    HttpRequest = http.IncomingMessage,
    Query = DefaultQuery,
    Params = DefaultParams,
    Headers = DefaultHeaders,
    Body = DefaultBody
  > {
    isAnonymousAccess(): boolean | undefined;
    _isAnonymousAccess: boolean | undefined;
  }
}

function isAnonymousAccess(this: FastifyRequest) {
  return this._isAnonymousAccess;
}

export default fp(async function (instance: FastifyInstance) {
  instance.decorateRequest('isAnonymousAccess', isAnonymousAccess);
});
