import * as AWS from 'aws-sdk';
import * as envVar from 'env-var';
import {ResourceRepository, ResourceGroup, FetchLatestResult} from './types';

export const defaultEndpoint = envVar.get('S3_ENDPOINT').asString();
export const bucketName = envVar.get('RESOURCE_BUCKET_NAME').asString();
export const objectKey = envVar
    .get('RESOURCE_OBJECT_KEY')
    .default('resources.json')
    .asString();

interface S3ResourceRepositoryConfig {
    s3: AWS.S3;
    bucketName: string;
    objectKey: string;
}
export class S3ResourceRepository implements ResourceRepository {
    protected current?: {etag?: string; rg: ResourceGroup};

    constructor(protected config: S3ResourceRepositoryConfig) {}

    async fetchLatest(): Promise<FetchLatestResult> {
        let response: AWS.S3.GetObjectOutput | undefined;

        try {
            response = await this.config.s3
                .getObject({
                    Bucket: this.config.bucketName,
                    Key: this.config.objectKey,
                    IfNoneMatch: this.current?.etag,
                })
                .promise();
        } catch (err) {
            if (isAwsError(err) && err.code === 'NotModified') {
                return {isNew: false, resourceGroup: this.current!.rg};
            }

            throw err;
        }

        const bodyRaw = response.Body?.toString();

        if (typeof bodyRaw === 'undefined') {
            throw new Error('ResourceGroup file found without any data');
        }

        const rg = JSON.parse(bodyRaw) as ResourceGroup;
        this.current = {etag: response.ETag, rg};

        return {
            isNew: true,
            resourceGroup: rg,
        };
    }

    async update(rg: ResourceGroup): Promise<void> {
        await this.config.s3
            .putObject({
                Bucket: this.config.bucketName,
                Key: this.config.objectKey,
                Body: JSON.stringify(rg),
            })
            .promise();
    }

    static fromEnvironment() {
        const s3endpoint = envVar
            .get('S3_ENDPOINT')
            .required()
            .asString();
        const bucketName = envVar
            .get('S3_RESOURCE_BUCKET_NAME')
            .required()
            .asString();
        const awsAccessKeyId = envVar.get('S3_AWS_ACCESS_KEY_ID').asString();
        const awsSecretAccessKey = envVar.get('S3_AWS_SECRET_ACCESS_KEY').asString();

        return new S3ResourceRepository({
            s3: new AWS.S3({
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
                endpoint: s3endpoint,
                s3ForcePathStyle: true,
                signatureVersion: 'v4',
            }),
            bucketName,
            objectKey,
        });
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
