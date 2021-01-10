import { FastifyRequest } from 'fastify';
import { ActiveDirectoryAuth } from '../upstreams';

export default interface RegistryRequestContext {
  request: Pick<FastifyRequest, 'headers' | 'decodeJWT'>;
  activeDirectoryAuth: ActiveDirectoryAuth;
}
