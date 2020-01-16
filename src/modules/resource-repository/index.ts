export interface ResourceGroup {
    etag?: string;
    schemas: Schema[];
}

interface ResourceMetadata {
    namespace: string;
    name: string;
}

interface Schema {
    metadata: ResourceMetadata;
    schema: string;
}

export {fetch, update} from './s3';
export {pollForUpdates} from './stream';
