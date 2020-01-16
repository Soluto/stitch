export interface ResourceGroup {
    etag?: string;
    schemas: Schema[];
    upstreams: Upstream[];
}

export interface ResourceMetadata {
    namespace: string;
    name: string;
}

export interface Schema {
    metadata: ResourceMetadata;
    schema: string;
}

export interface Upstream {
    metadata: ResourceMetadata;
    host: string;
    auth: Auth;
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
