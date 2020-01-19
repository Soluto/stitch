export interface ResourceGroup {
    etag?: string;
    schemas: Schema[];
    upstreams: Upstream[];
    upstreamClientCredentials: UpstreamClientCredentials[];
}

export interface Resource {
    metadata: ResourceMetadata;
}

export interface ResourceMetadata {
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
    auth: Auth;
    clientId: string;
    clientSecret: string;
}

export enum AuthType {
    ActiveDirectory = 'ActiveDirectory',
}

export interface Auth {
    type: AuthType;
    activeDirectory: ActiveDirectoryAuth;
}

export interface ActiveDirectoryAuth {
    authority: string;
    resource: string;
}

export {fetch, update} from './s3';
export {pollForUpdates} from './stream';
