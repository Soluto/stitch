export interface ResourceGroup {
    etag?: string;
    schemas: Schema[];
    upstreams: Upstream[];
    upstreamClientCredentials: UpstreamClientCredentials[];
}

export interface Resource {
    metadata: ResourceMetadata;
}

interface ResourceMetadata {
    namespace: string;
    name: string;
}

export interface Schema extends Resource {
    schema: string;
}

export interface Upstream extends Resource {
    host: string;
    auth: {
        type: AuthType;
        activeDirectory: {
            authority: string;
            resource: string;
        };
    };
}

export interface UpstreamClientCredentials extends Resource {
    authType: AuthType;
    activeDirectory: {
        authority: string;
        clientId: string;
        clientSecret: string;
    };
}

export interface ResourceRepository {
    fetch(): Promise<ResourceGroup>;
    fetch(etag?: string): Promise<ResourceGroup | null>;
    update(rg: ResourceGroup): Promise<void>;
}

enum AuthType {
    ActiveDirectory = 'ActiveDirectory',
}
