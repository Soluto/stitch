import { ClientOptions } from 'jwks-rsa';

export interface IssuerConfig {
  authority: string;
  jwksConfig?: Partial<ClientOptions>;
  audience?: string | string[];
  authenticatedPaths: string[];
  description?: string;
}

export interface ApiKeyConfig {
  name: string;
  description?: string;
  enabled?: boolean;
}
export interface AuthenticationConfig {
  jwt?: Record<string, IssuerConfig>;
  apiKey?: {
    header?: string;
    queryParam?: string;
    keys: Record<string, ApiKeyConfig>;
    authenticatedPaths: string[];
  };
  anonymous?: {
    publicPaths: string[];
    rejectAuthorizationHeader?: boolean;
  };
}
