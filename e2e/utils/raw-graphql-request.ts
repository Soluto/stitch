import fetch from 'cross-fetch';

export default (host: string, query: string, token?: string) => {
    const method = "POST";
    const headers = getHeaders(token);
    const body = JSON.stringify({ query });

    return fetch(`${host}/graphql`, {
        method,
        headers,
        body,
    });
};

const getHeaders = (token: string): { [name: string]: string } => {
    const baseHeaders = {
        'Content-Type': "application/json",
    };
    const headers = token ? {
        ...baseHeaders,
        Authorization: `Bearer ${token}`,
    } : baseHeaders;
    return headers;
};
