import { FastifyRequest, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
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
