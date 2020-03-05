import * as nock from 'nock';
import {ResourceGroup} from '../modules/resource-repository';
import {defaultEndpoint, bucketName, objectKey} from '../modules/resource-repository/s3';

export function mockResourceBucket(initialValue: ResourceGroup) {
    const value = {current: initialValue};

    nock(defaultEndpoint!)
        .persist()
        .get(`/${bucketName!}/${objectKey}`)
        .reply(200, value.current)
        .put(`/${bucketName!}/${objectKey}`)
        .reply(200, (_, body) => {
            value.current = JSON.parse(body as string) as ResourceGroup;
        });

    return value;
}
