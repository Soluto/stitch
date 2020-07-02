import { Issuer as BaseIssuer, Client, TokenSet } from 'openid-client';
import * as NodeCache from 'node-cache';

type Issuer = BaseIssuer<Client>;

export class ActiveDirectoryAuth {
  protected issuers = new Map<string, Issuer>();
  protected async getIssuer(issuerUrl: string): Promise<Issuer> {
    const cachedIssuer = this.issuers.get(issuerUrl);

    if (typeof cachedIssuer !== 'undefined') {
      return cachedIssuer;
    }

    const newIssuer = await BaseIssuer.discover(issuerUrl);
    this.issuers.set(issuerUrl, newIssuer);
    return newIssuer;
  }

  protected tokens = new NodeCache({ useClones: false });
  async getToken(issuerUrl: string, clientId: string, clientSecret: string, resource: string): Promise<string> {
    const cacheKey = issuerUrl + ' ; ' + clientId + ' ; ' + clientSecret + ' ; ' + resource;
    const cachedTokenSet = this.tokens.get<TokenSet>(cacheKey);

    if (typeof cachedTokenSet !== 'undefined') {
      return cachedTokenSet.access_token!;
    }

    const issuer = await this.getIssuer(issuerUrl);
    const client = new issuer.Client({ client_id: clientId, client_secret: clientSecret });
    const newTokenSet = await client.grant({
      grant_type: 'client_credentials',
      resource,
    });

    this.tokens.set(cacheKey, newTokenSet, newTokenSet.expires_in! - 30);

    return newTokenSet.access_token!;
  }
}
