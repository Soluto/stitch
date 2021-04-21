import { Options as JwksClientOptions } from 'jwks-rsa';

export interface IssuerConfig {
  authority: string;
  jwksConfig?: Partial<JwksClientOptions>;
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

export type JWTAuthConfig = Record<string, IssuerConfig>;
export interface AuthenticationConfig {
  jwt?: JWTAuthConfig;
  apiKey?: ApiKeyAuthConfig;
  anonymous?: AnonymousAuthConfig;
}
