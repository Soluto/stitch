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

export type UpstreamAuthCredentialsConfig = {
    type: string;
    authority: string;
    clientId: string;
    clientSecret: string;
};

export type AgogosObjectConfig =
    | SchemaConfig
    | UpstreamConfig
    | UpstreamAuthCredentialsConfig;

export type AgogosConfiguration = {
    schema: string,
    upstreams: { [name: string]: UpstreamConfig },
    upstreamAuthCredentials: { [name: string]: UpstreamAuthCredentialsConfig },
};
