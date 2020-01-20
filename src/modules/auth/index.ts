import {RequestContext} from '../context';

export async function getAuthHeaders(context: RequestContext, url: URL) {
    // Try AD auth
    const upstream = context.upstreams.get(url.host); // host includes port, hostname does not
    if (typeof upstream !== 'undefined') {
        const credentials = context.upstreamClientCredentials.get(upstream.auth.activeDirectory.authority);
        if (typeof credentials !== 'undefined') {
            const token = await context.activeDirectoryAuth.getToken(
                credentials.activeDirectory.authority,
                credentials.activeDirectory.clientId,
                credentials.activeDirectory.clientSecret,
                upstream.auth.activeDirectory.resource
            );
            return {
                Authorization: `Bearer ${token}`,
            };
        }
    }

    // If AD auth doesn't apply, pass along the header we got from the request
    const incomingAuthHeader = context.request.headers['authorization'];
    if (incomingAuthHeader) {
        return {
            Authorization: incomingAuthHeader as string,
        };
    }

    return null;
}
