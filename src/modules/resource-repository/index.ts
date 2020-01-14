export interface ResourceGroup {
    etag?: string;
    schemas: {[name: string]: string};
}

export {fetch as bucketFetch} from './s3';
export {fetch} from './static';
