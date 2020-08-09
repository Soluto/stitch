import * as fastify from 'fastify';

// There is problem with typings in the module: https://github.com/auth0/node-jwks-rsa/issues/78
import * as jwks from 'jwks-rsa';
import { ClientOptions, JwksClient } from 'jwks-rsa';
import logger from '../logger';
import { authenticationConfig } from '../config';

const createClient = (jwks as unknown) as (options: ClientOptions) => JwksClient;

export default function getSecret(
  request: fastify.FastifyRequest,
  _reply: fastify.FastifyReply<unknown>,
  cb: (e: Error | null, secret: string | undefined) => void
): void {
  const decodedJWT = request.decodeJWT();
  const kid = decodedJWT?.header.kid as string;
  const issuer = decodedJWT?.payload.iss as string;

  const issuerConfig = authenticationConfig?.jwt?.[issuer];
  if (!issuerConfig) {
    // eslint-disable-next-line unicorn/no-useless-undefined
    cb(new Error('No appropriate authentication configuration found'), undefined);
    return;
  }

  const jwkClient = createClient({
    jwksUri: issuerConfig.jwkUrl,
  });

  jwkClient.getSigningKey(kid, (err, key) => {
    if (err) {
      logger.error(err, 'Failed to get JWK for request token.');
      // eslint-disable-next-line unicorn/no-useless-undefined
      cb(err, undefined);
      return;
    }
    cb(null, key.getPublicKey());
  });
}
