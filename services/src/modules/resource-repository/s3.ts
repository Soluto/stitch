import * as AWS from 'aws-sdk';
import * as envVar from 'env-var';
import pLimit from 'p-limit';
import * as config from '../config';
import logger from '../logger';
import {ResourceRepository, ResourceGroup, FetchLatestResult} from './types';

interface S3ResourceRepositoryConfig {
    s3: AWS.S3;
    bucketName: string;
    objectKey: string;
    policyAttachmentsKeyPrefix: string;
}
type FileDetails = {filename: string; updatedAt: Date};

export class S3ResourceRepository implements ResourceRepository {
    protected current?: {etag?: string; rg: ResourceGroup};
    protected policyAttachments: {[filename: string]: Buffer} = {};
    protected policyAttachmentsRefreshedAt?: Date;

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

    getResourceGroup(): ResourceGroup {
        return this.current!.rg;
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

    async writePolicyAttachment(filename: string, content: Buffer): Promise<void> {
        const s3Key = this.getPolicyAttachmentKey(filename);

        await this.config.s3
            .putObject({
                Bucket: this.config.bucketName,
                Key: s3Key,
                Body: content,
            })
            .promise();
    }

    public getPolicyAttachment(filename: string): Buffer {
        return this.policyAttachments[filename];
    }

    public async initializePolicyAttachments() {
        try {
            await this.refreshPolicyAttachments();
        } catch (err) {
            logger.fatal({err}, 'Failed fetching s3 policy attachments on startup');
            throw err;
        }

        setInterval(async () => {
            try {
                await this.refreshPolicyAttachments();
            } catch (err) {
                logger.error(
                    {err},
                    `Failed refreshing s3 policy attachments, last successful refresh was at ${this.policyAttachmentsRefreshedAt}`
                );
            }
        }, config.resourceUpdateInterval);
    }

    private async refreshPolicyAttachments() {
        const newRefreshedAt = new Date();

        const allAttachments = await this.getPolicyAttachmentsList();
        const attachmentsToRefresh = allAttachments
            .filter(a => this.shouldRefreshPolicyAttachment(a))
            .map(a => a.filename);

        if (attachmentsToRefresh.length > 0) {
            const newAttachments = await this.getPolicyAttachments(attachmentsToRefresh);
            newAttachments.forEach(a => (this.policyAttachments[a.filename] = a.content));
        }

        this.policyAttachmentsRefreshedAt = newRefreshedAt;
    }

    private shouldRefreshPolicyAttachment({filename, updatedAt}: FileDetails) {
        if (!this.policyAttachments[filename]) return true;
        if (!this.policyAttachmentsRefreshedAt) return true;

        return updatedAt > this.policyAttachmentsRefreshedAt;
    }

    private async getPolicyAttachmentsList(): Promise<FileDetails[]> {
        const attachments: FileDetails[] = [];
        let isTruncated = true;
        let continuationToken;

        while (isTruncated) {
            const params: AWS.S3.Types.ListObjectsV2Request = {
                Bucket: this.config.bucketName,
                MaxKeys: 1000,
                Prefix: this.config.policyAttachmentsKeyPrefix,
            };
            if (continuationToken) params.ContinuationToken = continuationToken;

            const listResult = await this.config.s3.listObjectsV2(params).promise();
            const keys = listResult.Contents || [];
            const newAttachments: FileDetails[] = keys.map(k => ({
                filename: this.getPolicyAttachmentFilenameByKey(k.Key!),
                updatedAt: k.LastModified!,
            }));
            attachments.push(...newAttachments);

            isTruncated = listResult.IsTruncated!;
            if (isTruncated) continuationToken = listResult.ContinuationToken;
        }

        return attachments;
    }

    private async getPolicyAttachments(filenames: string[]): Promise<{filename: string; content: Buffer}[]> {
        const limit = pLimit(10);

        return Promise.all(
            filenames.map(filename => {
                return limit(async () => {
                    const key = this.getPolicyAttachmentKey(filename);
                    const params = {Bucket: this.config.bucketName, Key: key};
                    const res = await this.config.s3.getObject(params).promise();

                    return {filename, content: res.Body as Buffer};
                });
            })
        );
    }

    private getPolicyAttachmentKey(filename: string) {
        return `${this.getPolicyAttachmentPrefix()}${filename}`;
    }

    private getPolicyAttachmentPrefix() {
        return this.config.policyAttachmentsKeyPrefix.endsWith('/')
            ? this.config.policyAttachmentsKeyPrefix
            : `${this.config.policyAttachmentsKeyPrefix}/`;
    }

    private getPolicyAttachmentFilenameByKey(key: string) {
        return key.replace(this.getPolicyAttachmentPrefix(), '');
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
        const objectKey = envVar
            .get('S3_RESOURCE_OBJECT_KEY')
            .default('resources.json')
            .asString();
        const policyAttachmentsKeyPrefix = envVar
            .get('S3_POLICY_ATTACHMENTS_KEY_PREFIX')
            .default('policyAttachments/')
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
            policyAttachmentsKeyPrefix,
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
