import * as fastify from 'fastify';
import fetch from 'node-fetch';

// There is problem with typings in the module: https://github.com/auth0/node-jwks-rsa/issues/78
import * as jwks from 'jwks-rsa';
import { ClientOptions, JwksClient } from 'jwks-rsa';
import logger from '../logger';
import { authenticationConfig } from '../config';

const createClient = (jwks as unknown) as (options: ClientOptions) => JwksClient;

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

const defaultConfig: Partial<ClientOptions> = {
  cacheMaxAge: 24 * 60 * 60 * 1000,
};

async function getJwkClient(authority: string, jwksConfig: Partial<ClientOptions>) {
  if (!jwkClients[authority]) {
    const jwksUri = await getJwksUri(authority);
    logger.debug({ jwksUri }, 'New JWK received. Creating new client...');
    const clientOptions: Partial<ClientOptions> = {
      jwksUri,
      ...defaultConfig,
      ...jwksConfig,
    };
    if (!clientOptions.jwksUri) {
      throw new Error(`Failed to retrieve jwksUri for ${authority} from ${jwksUri}`);
    }
    jwkClients[authority] = createClient(clientOptions as ClientOptions);
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

  const { authority, jwksConfig } = issuerConfig;
  const jwkClient = await getJwkClient(authority, jwksConfig);

  jwkClient.getSigningKey(kid, (err, key) => {
    if (err) {
      logger.error({ err, authority, jwksUri: jwksConfig.jwksUri }, 'Failed to get JWK for request token.');
      // eslint-disable-next-line unicorn/no-useless-undefined
      cb(err, undefined);
      return;
    }
    logger.trace({ authority }, 'JWK found');
    cb(null, key.getPublicKey());
  });
}
