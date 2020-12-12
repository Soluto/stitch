import { Upstream, UpstreamClientCredentials } from '../../resource-repository';
import { ActiveDirectoryAuth } from '.';

export interface AuthenticationConfig {
  getUpstreamByHost: (host: string) => Upstream | undefined;
  getUpstreamClientCredentialsByAuthority: (authority: string) => UpstreamClientCredentials | undefined;
  activeDirectoryAuth: ActiveDirectoryAuth;
}
