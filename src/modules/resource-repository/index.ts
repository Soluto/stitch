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
    auth: Auth;
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

interface Auth {
    type: AuthType;
    activeDirectory: ActiveDirectoryAuth;
}

interface ActiveDirectoryAuth {
    authority: string;
    resource: string;
}

export {fetch, update} from './s3';
export {pollForUpdates} from './stream';
export {applyResourceGroupUpdates} from './util';
