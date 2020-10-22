import * as querystring from 'querystring';
import * as jwtUtil from 'jsonwebtoken';
import * as NodeRSA from 'node-rsa';

export async function getToken(
  clientId = 'gateway-client-id',
  clientSecret = 'gateway-client-secret',
  scope = 'stitch-gateway',
  tokenEndpoint = 'http://localhost:8070/connect/token'
): Promise<string> {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: querystring.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: scope,
    }),
    redirect: 'follow',
  });
  const responseBody = await response.json();
  return responseBody.access_token as string;
}

export async function getInvalidToken(
  clientId = 'gateway-client-id',
  scope = ['stitch-gateway'],
  issuer = 'http://localhost:8070',
  audience = 'Stitch Gateway'
): Promise<string> {
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
