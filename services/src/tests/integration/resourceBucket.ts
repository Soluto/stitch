import * as nock from 'nock';
import {ResourceGroup} from '../../modules/resource-repository';

export function mockResourceBucket(initialValue: ResourceGroup) {
    const s3endpoint = process.env.S3_ENDPOINT;
    const bucketName = process.env.S3_RESOURCE_BUCKET_NAME;
    const objectKey = process.env.S3_RESOURCE_OBJECT_KEY;

    const value = {current: initialValue};

    nock(s3endpoint!)
        .persist()
        .get(`/${bucketName!}/${objectKey}`)
        .reply(200, value.current)
        .put(`/${bucketName!}/${objectKey}`)
        .reply(200, (_, body) => {
            value.current = JSON.parse(body as string) as ResourceGroup;
        });

    return value;
}
