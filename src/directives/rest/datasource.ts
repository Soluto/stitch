import {RESTDataSource} from 'apollo-datasource-rest';
import {KeyValue, RestParams} from './types';

function keyValueArrayToDictionary(kvs: KeyValue[]): {[key: string]: string} {
    const dict: {[key: string]: string} = {};
    for (const {key, value} of kvs) {
        dict[key] = value;
    }
    return dict;
}

export class RESTDirectiveDataSource extends RESTDataSource {
    doRequest(params: RestParams, _parent: any, _args: {[key: string]: any}) {
        const query = params.query && ((params.query as unknown) as [string, Object][]);
        const headers = params.headers && keyValueArrayToDictionary(params.headers);

        let doFetch: RESTDataSource['get'];
        switch (params.method?.toUpperCase()) {
            case 'GET':
            default:
                doFetch = this.get;
                break;
            case 'POST':
                doFetch = this.post;
                break;
            case 'DELETE':
                doFetch = this.delete;
                break;
            case 'PUT':
                doFetch = this.put;
                break;
            case 'PATCH':
                doFetch = this.patch;
                break;
        }

        return doFetch.call(this, params.url, query, {headers});
    }
}

declare module '../../context' {
    interface ContextDataSources {
        rest: RESTDirectiveDataSource;
    }
}
