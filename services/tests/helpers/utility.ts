import fetch from 'node-fetch';

export const sleep = (timeout: number) => new Promise(r => setTimeout(r, timeout));

export const minutesAgo = (m: number) => new Date(Date.now() - m * 60000);

export async function updateGatewaySchema(gatewayBaseUrl: string, xApiKeyHeader = process.env.API_KEY!) {
  const response = await fetch(`${gatewayBaseUrl}/updateSchema`, {
    method: 'POST',
    headers: {
      ['x-api-key']: xApiKeyHeader,
    },
  });
  return response;
}
