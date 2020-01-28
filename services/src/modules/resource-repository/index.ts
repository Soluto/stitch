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

enum AuthType {
    ActiveDirectory = 'ActiveDirectory',
}

export {fetch, update} from './s3';
export {pollForUpdates} from './stream';
export {applyResourceGroupUpdates} from './util';
