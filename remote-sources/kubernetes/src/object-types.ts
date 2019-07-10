export type SchemaConfig = {
  definition: string;
};

export type UpstreamConfig = {
  host: string;
  headers: {
    name: string;
    value: string;
  }[];
  auth: {
    type: string;
    authority: string;
    scope: string;
  };
};

export type UpstreamClientCredentialsConfig = {
  type: string;
  authority: string;
  clientId: string;
  clientSecret:
    | string
    | {
        valueFrom: {
          secretKeyRef: {
            secretName: string;
            key: string;
          };
        };
      };
};

export type AgogosObjectConfig =
  | SchemaConfig
  | UpstreamConfig
  | UpstreamClientCredentialsConfig;
