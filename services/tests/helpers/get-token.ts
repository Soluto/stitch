import * as querystring from 'querystring';

export default async function getToken(
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  scope: string
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
