export interface IssuerConfig {
  jwkUrl: string;
  audience?: string;
  authenticatedPaths: string[];
}

export interface AuthenticationConfig {
  jwt?: Record<string, IssuerConfig>;
  anonymous?: {
    publicPaths: string[];
  };
}
