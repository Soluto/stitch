import * as fastify from 'fastify';
import fetch from 'node-fetch';

import { Options as JwksClientOptions, JwksClient } from 'jwks-rsa';
import logger from '../logger';
import { authenticationConfig } from '../config';

const jwkClients: Record<string, JwksClient> = {};

async function getJwksUri(authority: string) {
  try {
    const discoveryResponse = await fetch(`${authority}/.well-known/openid-configuration`);
    const discoveryResult = await discoveryResponse.json();

    return discoveryResult['jwks_uri'] as string;
  } catch {
    return;
  }
}

const defaultConfig: Partial<JwksClientOptions> = {
  cacheMaxAge: 24 * 60 * 60 * 1000,
};

async function getJwkClient(authority: string, jwksConfig?: Partial<JwksClientOptions>) {
  if (!jwkClients[authority]) {
    const jwksUri = jwksConfig?.jwksUri ?? (await getJwksUri(authority));
    logger.debug({ authority, jwksUri }, 'New authority received. Creating new JWKs client...');
    const clientOptions: Partial<JwksClientOptions> = {
      jwksUri,
      ...defaultConfig,
      ...jwksConfig,
    };
    if (!clientOptions.jwksUri) {
      throw new Error(`Failed to retrieve jwksUri for ${authority} from ${jwksUri}`);
    }
    jwkClients[authority] = new JwksClient(clientOptions as JwksClientOptions);
  }
  return jwkClients[authority]!;
}

export default async function getSecret(
  request: fastify.FastifyRequest,
  _reply: fastify.FastifyReply<unknown>,
  cb: (e: Error | null, secret: string | undefined) => void
): Promise<void> {
  const decodedJWT = request.decodeJWT();
  const kid = decodedJWT?.header.kid as string;
  const issuer = decodedJWT?.payload.iss as string;

  const issuerConfig = authenticationConfig?.jwt?.[issuer];
  if (!issuerConfig) {
    // eslint-disable-next-line unicorn/no-useless-undefined
    cb(new Error('No appropriate authentication configuration found'), undefined);
    return;
  }

  try {
    const { authority, jwksConfig } = issuerConfig;
    const jwkClient = await getJwkClient(authority, jwksConfig);

    jwkClient.getSigningKey(kid, (err, key) => {
      if (err) {
        logger.error({ err, authority, jwksUri: jwksConfig?.jwksUri }, 'Failed to get JWK for request token.');
        // eslint-disable-next-line unicorn/no-useless-undefined
        cb(err, undefined);
      } else {
        logger.debug({ authority }, 'JWK found');
        cb(null, key.getPublicKey());
      }
    });
  } catch (err) {
    logger.error({ err, issuerConfig }, 'Failed to get JWK config.');
    // eslint-disable-next-line unicorn/no-useless-undefined
    cb(err, undefined);
    return;
  }
}
