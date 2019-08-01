export type SchemaConfig = {
    definition: string;
}

export type UpstreamConfig = {
    host: string;
    headers: Array<{
        name: string;
        value: string;
    }>;
    auth: {
        authType: string;
        authority: string;
        scope: string;
    };
}

export type UpstreamAuthCredentialsConfig = {
    authType: string;
    authority: string;
    clientId: string;
    clientSecret: string;
}

export type AgogosObjectConfig =
    | SchemaConfig
    | UpstreamConfig
    | UpstreamAuthCredentialsConfig;

export type AgogosConfiguration = {
    schema: string,
    upstreams: { [name: string]: UpstreamConfig },
    upstreamAuthCredentials: { [name: string]: UpstreamAuthCredentialsConfig },
}
