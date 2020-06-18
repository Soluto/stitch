import * as nock from 'nock';
import * as xml2js from 'xml2js';
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
        .get(new RegExp(`/${bucketName!}\?.*prefix=${encodeURIComponent(policiesKeyPrefix!)}.*`))
        .reply(200, () => {
            const filenames = Object.keys(value.policyFiles).map(filename => ({
                Key: filename,
                LastModified: new Date(),
            }));
            const xmlBuilder = new xml2js.Builder();
            return xmlBuilder.buildObject({Contents: filenames, IsTruncated: false});
        })
        .get(new RegExp(`/${bucketName!}/${policiesKeyPrefix}.+`))
        .reply(200, uri => {
            const filename = getFilenameFromUri(uri);
            return {Body: value.policyFiles[filename]};
        })
        .put(new RegExp(`/${bucketName!}/${policiesKeyPrefix}.+`))
        .reply(200, (uri, body) => {
            const filename = getFilenameFromUri(uri);
            value.policyFiles[filename] = body as string;
        });

    return value;
}

const getFilenameFromUri = (uri: string) => uri.split('/').slice(-1)[0];

type MockPolicyFiles = {[name: string]: string};
