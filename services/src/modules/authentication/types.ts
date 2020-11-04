import { ClientOptions } from 'jwks-rsa';

export interface IssuerConfig {
  authority: string;
  jwksConfig?: Partial<ClientOptions>;
  audience?: string;
  authenticatedPaths: string[];
  description?: string;
}

export interface AuthenticationConfig {
  jwt?: Record<string, IssuerConfig>;
  anonymous?: {
    publicPaths: string[];
  };
}
