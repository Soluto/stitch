import * as AWS from 'aws-sdk';
import * as envVar from 'env-var';
import {ResourceRepository, ResourceGroup} from './types';

export const defaultEndpoint = envVar.get('S3_ENDPOINT').asString();
export const bucketName = envVar.get('RESOURCE_BUCKET_NAME').asString();
export const objectKey = envVar
    .get('RESOURCE_OBJECT_KEY')
    .default('resources.json')
    .asString();

function createFromEnvironment() {
    const s3endpoint = envVar
        .get('S3_ENDPOINT')
        .required()
        .asString();
    const bucketName = envVar
        .get('RESOURCE_BUCKET_NAME')
        .required()
        .asString();
    const awsAccessKeyId = envVar.get('AWS_ACCESS_KEY_ID').asString();
    const awsSecretAccessKey = envVar.get('AWS_SECRET_ACCESS_KEY').asString();

    return {
        s3: new AWS.S3({
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
            endpoint: s3endpoint,
            s3ForcePathStyle: true,
            signatureVersion: 'v4',
        }),
        bucketName,
        objectKey,
    };
}

interface S3ResourceRepositoryConfig {
    s3: AWS.S3;
    bucketName: string;
    objectKey: string;
}
export class S3ResourceRepository implements ResourceRepository {
    config: S3ResourceRepositoryConfig;

    constructor(config?: S3ResourceRepositoryConfig) {
        if (!config) {
            this.config = createFromEnvironment();
        } else {
            this.config = config;
        }
    }

    /** Returns latest resource group */
    fetch(): Promise<ResourceGroup>;

    /** Returns latest resource group, or null if etag matches */
    async fetch(etag?: string): Promise<ResourceGroup | null> {
        let response: AWS.S3.GetObjectOutput | undefined;

        try {
            response = await this.config.s3
                .getObject({
                    Bucket: this.config.bucketName,
                    Key: this.config.objectKey,
                    IfNoneMatch: etag,
                })
                .promise();
        } catch (err) {
            if (isAwsError(err)) {
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
        await this.config.s3
            .putObject({
                Bucket: this.config.bucketName,
                Key: this.config.objectKey,
                Body: JSON.stringify(rgWithoutEtag),
            })
            .promise();
    }
}

function isAwsError(e: any): e is AWS.AWSError {
    return (
        typeof e.code !== 'undefined' &&
        typeof e.statusCode !== 'undefined' &&
        typeof e.region !== 'undefined' &&
        typeof e.retryable !== 'undefined' &&
        typeof e.requestId !== 'undefined'
    );
}
