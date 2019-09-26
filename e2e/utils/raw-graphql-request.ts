import fetch from 'cross-fetch';

export default (host: string, query: string, token?: string) => {
  const method = 'POST';
  const headers = getHeaders(token);
  const body = JSON.stringify({ query });

  return fetch(`${host}/graphql`, {
    method,
    headers,
    body
  });
};

type Headers = { [name: string]: string };

const getHeaders = (token: string): Headers => {
  const headers: Headers = { 'Content-Type': 'application/json' };
  if (token) { headers.Authorization = `Bearer ${token}`; }
  return headers;
};
