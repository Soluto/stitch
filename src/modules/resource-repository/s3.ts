import * as AWS from 'aws-sdk';
import {ResourceGroup} from '.';

const s3 = new AWS.S3({
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
    endpoint: 'http://localhost:9000',
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
});

function isAwsError(e: any): e is AWS.AWSError {
    return (
        typeof e.code !== 'undefined' &&
        typeof e.statusCode !== 'undefined' &&
        typeof e.region !== 'undefined' &&
        typeof e.retryable !== 'undefined' &&
        typeof e.requestId !== 'undefined'
    );
}

async function getObjectIfChanged(request: AWS.S3.GetObjectRequest) {
    try {
        return await s3.getObject({...request}).promise();
    } catch (err) {
        if ((isAwsError(err) && err.code === 'NotModified') || err.statusCode === 304) {
            return null;
        }

        throw err;
    }
}

/** Returns latest resource group, or null if etag matches */
export async function fetch(currentEtag?: string): Promise<ResourceGroup | null> {
    const response = await getObjectIfChanged({
        Bucket: 'mybucket',
        Key: 'latest.json',
        IfNoneMatch: currentEtag,
    });

    if (response === null) {
        return null;
    }

    const bodyRaw = response.Body?.toString();

    if (typeof bodyRaw === 'undefined') {
        throw new Error('ResourceGroup file found without any data');
    }

    return {
        etag: response.ETag,
        schemas: JSON.parse(bodyRaw),
    };
}

export async function update(rg: ResourceGroup): Promise<void> {
    await s3.putObject({Bucket: 'mybucket', Key: 'latest.json', Body: JSON.stringify(rg.schemas)});
    await s3.copyObject({Bucket: 'mybucket', Key: 'someversion.json', CopySource: '/mybucket/latest.json'});
}
