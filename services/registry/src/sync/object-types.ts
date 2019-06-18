export type GqlSchemaConfig = string;

export type GqlEndpointConfig = {
    host: string,
    headers: {
        name: string,
        value: string,
    }[],
    auth: {
        type: string,
        authority: string,
        scope: string,
    }
};


export type GqlAuthProviderConfig = {
    type: string,
    authority: string,
    client_id: string,
    client_secret: string,
};

export type GqlAgogosObjectConfig = GqlSchemaConfig | GqlEndpointConfig | GqlAuthProviderConfig;