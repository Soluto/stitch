import { ClientOptions } from 'jwks-rsa';

export interface IssuerConfig {
  authority: string;
  jwksConfig?: Partial<ClientOptions>;
  audience?: string | string[];
  authenticatedPaths: string[];
  description?: string;
}

export interface ApiKeyAuthConfig {
  header?: string;
  queryParam?: string;
  keys: Record<string, ApiKeyConfig>;
  authenticatedPaths: string[];
}

export interface ApiKeyConfig {
  name: string;
  description?: string;
  disabled?: boolean;
}

export interface AnonymousAuthConfig {
  publicPaths: string[];
  rejectAuthorizationHeader?: boolean;
}
export interface AuthenticationConfig {
  jwt?: Record<string, IssuerConfig>;
  apiKey?: ApiKeyAuthConfig;
  anonymous?: AnonymousAuthConfig;
}
