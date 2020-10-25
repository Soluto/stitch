export interface IssuerConfig {
  jwksUri: string;
  audience?: string;
  authenticatedPaths: string[];
}

export interface AuthenticationConfig {
  jwt?: Record<string, IssuerConfig>;
  anonymous?: {
    publicPaths: string[];
  };
}
