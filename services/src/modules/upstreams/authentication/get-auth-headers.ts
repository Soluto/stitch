import logger from '../../logger';
import { Upstream, UpstreamClientCredentials } from '../../resource-repository';
import { ActiveDirectoryAuth } from './active-directory-auth';

export async function getAuthHeaders(
  upstream: Upstream,
  upstreamClientCredentials: UpstreamClientCredentials[],
  activeDirectoryAuth: ActiveDirectoryAuth
) {
  // Try AD auth
  // TODO: Store upstreams in map for quick lookup

  if (!upstream.auth) return;

  // TODO: Store upstreamClientCredentials in map for quick lookup
  const credentials = upstreamClientCredentials.find(
    uc => uc.activeDirectory.authority === upstream.auth!.activeDirectory.authority
  );
  if (!credentials) return;

  try {
    const token = await activeDirectoryAuth.getToken(
      credentials.activeDirectory.authority,
      credentials.activeDirectory.clientId,
      credentials.activeDirectory.clientSecret,
      upstream.auth.activeDirectory.resource
    );

    return {
      Authorization: `Bearer ${token}`,
    };
  } catch (ex) {
    logger.error('Failed to authenticate with Active Directory', ex);
    throw ex;
  }
}
