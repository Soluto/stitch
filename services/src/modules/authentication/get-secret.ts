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

export default async function getSecret(request: fastify.FastifyRequest): Promise<string> {
  const decodedJWT = request.decodeJWT();
  const kid = decodedJWT?.header.kid as string;
  const issuer = decodedJWT?.payload.iss as string;

  const issuerConfig = authenticationConfig?.jwt?.[issuer];
  if (!issuerConfig) {
    // eslint-disable-next-line unicorn/no-useless-undefined
    throw new Error('No appropriate authentication configuration found');
  }

  try {
    const { authority, jwksConfig } = issuerConfig;
    const jwkClient = await getJwkClient(authority, jwksConfig);

    const key = await jwkClient.getSigningKey(kid);
    return key.getPublicKey();
  } catch (err) {
    logger.error({ err, issuerConfig }, 'Failed to get JWK.');
    // eslint-disable-next-line unicorn/no-useless-undefined
    throw err;
  }
}
