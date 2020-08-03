import fastify from 'fastify';
import { authenticationConfig } from '../../config';

export default function (
  request: fastify.FastifyRequest,
  _reply: fastify.FastifyReply<unknown>,
  done: (error?: Error) => void
) {
  const anonymousPaths = authenticationConfig?.anonymous?.paths;
  if (anonymousPaths && anonymousPaths.some(ap => request.raw.url?.endsWith(ap))) {
    done();
    return;
  }
  done(new Error('Unauthorized'));
}
