import * as querystring from 'querystring';
import * as jwtUtil from 'jsonwebtoken';
import * as NodeRSA from 'node-rsa';

export interface TokenOptions {
  clientId: string;
  clientSecret: string;
  scope: string | string[];
  tokenEndpoint: string;
}

const defaultGetTokenOptions: TokenOptions = {
  clientId: 'gateway-client-id',
  clientSecret: 'gateway-client-secret',
  scope: 'stitch-gateway',
  tokenEndpoint: 'http://localhost:8060/connect/token',
};

export async function getToken(options: Partial<TokenOptions> = {}): Promise<string> {
  const { clientId, clientSecret, scope, tokenEndpoint } = { ...defaultGetTokenOptions, ...options };
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: querystring.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }),
    redirect: 'follow',
  });
  const responseBody = await response.json();
  return responseBody.access_token as string;
}

export interface InvalidTokenOptions {
  clientId: string;
  scope: string | string[];
  issuer: string;
  audience: string;
}

const defaultInvalidTokenOptions: InvalidTokenOptions = {
  clientId: 'gateway-client-id',
  scope: ['stitch-gateway'],
  issuer: 'http://localhost:8070',
  audience: 'Stitch Gateway',
};

export async function getInvalidToken(options: Partial<InvalidTokenOptions> = {}): Promise<string> {
  const { clientId, scope, issuer, audience } = { ...defaultInvalidTokenOptions, ...options };
  const secret = new NodeRSA({ b: 2048 }).exportKey('private');
  const accessToken = jwtUtil.sign({ client_id: clientId, scope }, secret, {
    algorithm: 'RS256',
    issuer,
    keyid: 'C1B59DF60057CFB292C4E36CCE329615',
    audience,
    jwtid: '248A293C7FA8D9C3BDB021F963344E94',
  });
  return accessToken;
}
