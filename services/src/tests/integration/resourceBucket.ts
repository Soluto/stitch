import * as nock from 'nock';
import {ResourceGroup} from '../../modules/resource-repository';

export function mockResourceBucket(initialValue: ResourceGroup, initialPolicyFiles: MockPolicyFiles = {}) {
    const s3endpoint = process.env.S3_ENDPOINT;
    const bucketName = process.env.S3_RESOURCE_BUCKET_NAME;
    const objectKey = process.env.S3_RESOURCE_OBJECT_KEY;
    const policiesKeyPrefix = process.env.S3_POLICY_ATTACHMENTS_KEY_PREFIX;

    const value = {current: initialValue, policyFiles: initialPolicyFiles};

    nock(s3endpoint!)
        .persist()
        .get(`/${bucketName!}/${objectKey}`)
        .reply(200, value.current)
        .put(`/${bucketName!}/${objectKey}`)
        .reply(200, (_, body) => {
            value.current = JSON.parse(body as string) as ResourceGroup;
        })
        .put(new RegExp(`/${bucketName!}/${policiesKeyPrefix}.+`))
        .reply(200, (uri, body) => {
            const filename = uri.split('/').slice(-1)[0];
            value.policyFiles[filename] = body as string;
        });

    return value;
}

type MockPolicyFiles = {[name: string]: string};
