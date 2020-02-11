import * as AWS from 'aws-sdk';
import {resourceBucketName, s3endpoint, awsAccessKeyId, awsSecretAccessKey, resourcesObjectKey} from '../config';
import {ResourceGroup, ResourceRepository} from '.';

export class S3ResourceRepository implements ResourceRepository {
    protected s3 = new AWS.S3({
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
        endpoint: s3endpoint,
        s3ForcePathStyle: true,
        signatureVersion: 'v4',
    });

    isAwsError(e: any): e is AWS.AWSError {
        return (
            typeof e.code !== 'undefined' &&
            typeof e.statusCode !== 'undefined' &&
            typeof e.region !== 'undefined' &&
            typeof e.retryable !== 'undefined' &&
            typeof e.requestId !== 'undefined'
        );
    }

    /** Returns latest resource group */
    fetch(): Promise<ResourceGroup>;
    /** Returns latest resource group, or null if etag matches */
    fetch(currentEtag?: string): Promise<ResourceGroup | null>;
    async fetch(currentEtag?: string): Promise<ResourceGroup | null> {
        let response: AWS.S3.GetObjectOutput | undefined;

        try {
            response = await this.s3
                .getObject({
                    Bucket: resourceBucketName,
                    Key: resourcesObjectKey,
                    IfNoneMatch: currentEtag,
                })
                .promise();
        } catch (err) {
            if (this.isAwsError(err)) {
                if (err.code === 'NotModified') {
                    return null;
                }

                if (err.code === 'NoSuchKey') {
                    return {schemas: [], upstreams: [], upstreamClientCredentials: []};
                }
            }

            throw err;
        }

        const bodyRaw = response.Body?.toString();

        if (typeof bodyRaw === 'undefined') {
            throw new Error('ResourceGroup file found without any data');
        }

        return {
            etag: response.ETag,
            ...JSON.parse(bodyRaw),
        };
    }

    async update(rg: ResourceGroup): Promise<void> {
        const {etag, ...rgWithoutEtag} = rg;
        await this.s3
            .putObject({Bucket: resourceBucketName, Key: resourcesObjectKey, Body: JSON.stringify(rgWithoutEtag)})
            .promise();
    }
}
