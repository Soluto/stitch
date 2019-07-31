export interface ISchemaConfig {
    definition: string;
}

export interface IUpstreamConfig {
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

export interface IUpstreamAuthCredentialsConfig {
    authType: string;
    authority: string;
    clientId: string;
    clientSecret: string;
}

export type AgogosObjectConfig =
    | ISchemaConfig
    | IUpstreamConfig
    | IUpstreamAuthCredentialsConfig;

export interface IAgogosConfiguration {
    schema: string,
    upstreams: { [name: string]: IUpstreamConfig },
    upstreamAuthCredentials: { [name: string]: IUpstreamAuthCredentialsConfig },
}
