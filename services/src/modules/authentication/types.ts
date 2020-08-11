export interface IssuerConfig {
  jwkUrl: string;
  authenticatedPaths: string[];
}

export interface AuthenticationConfig {
  jwt?: Record<string, IssuerConfig>;
  anonymous?: {
    paths: string[];
  };
}
