import * as nock from 'nock';
import {ResourceGroup} from '../modules/resource-repository';
import {resourceBucketName, resourcesObjectKey, s3endpoint} from '../modules/config';

export function mockResourceBucketReads(rg: ResourceGroup) {
    nock(s3endpoint)
        .persist()
        .get(`/${resourceBucketName}/${resourcesObjectKey}`)
        .reply(200, rg);
}

export function mockResourceBucketReadsOverTime(rgs: ResourceGroup[]) {
    const scope = nock(s3endpoint);

    for (const rg of rgs) {
        scope.get(`/${resourceBucketName}/${resourcesObjectKey}`).reply(200, rg);
    }
}

export function mockResourceBucket(initialValue: ResourceGroup) {
    const value = {current: initialValue};

    nock(s3endpoint)
        .persist()
        .get(`/${resourceBucketName}/${resourcesObjectKey}`)
        .reply(200, value.current)
        .put(`/${resourceBucketName}/${resourcesObjectKey}`)
        .reply(200, (_, body) => {
            value.current = JSON.parse(body as string) as ResourceGroup;
        });

    return value;
}
