import * as envVar from 'env-var';
import { S3Storage } from '../storage';
import { FetchLatestResult, ResourceGroup, ResourceRepository } from '.';

export class S3ResourceRepository extends ResourceRepository {
  protected resourceGroup?: { etag: string; resources: ResourceGroup };

  constructor(
    protected storage: S3Storage,
    protected resourceFilePath: string,
    protected policyAttachmentsFolderPath: string,
    protected isRegistry = false
  ) {
    super(storage, resourceFilePath, policyAttachmentsFolderPath, isRegistry);
  }

  async fetchLatest(): Promise<FetchLatestResult> {
    let content: string, etag: string;

    try {
      ({ content, etag } = await this.storage.readFile(this.resourceFilePath, {
        asString: true,
        etag: this.resourceGroup?.etag,
      }));
    } catch (err) {
      if (isAwsError(err) && err.code === 'NotModified') {
        await this.refreshPolicyAttachments();
        this.resourceGroup!.resources.policyAttachments = { ...this.policyAttachments.attachments };

        return { isNew: false, resourceGroup: this.resourceGroup!.resources };
      }

      throw err;
    }

    const resources = JSON.parse(content) as ResourceGroup;
    this.resourceGroup = { etag, resources };

    await this.refreshPolicyAttachments();
    resources.policyAttachments = { ...this.policyAttachments.attachments };

    return { isNew: true, resourceGroup: resources };
  }

  static fromEnvironment(options: { isRegistry: boolean } = { isRegistry: false }) {
    const s3endpoint = envVar.get('S3_ENDPOINT').required().asString();
    const bucketName = envVar.get('S3_RESOURCE_BUCKET_NAME').required().asString();
    const resourceFilePath = envVar.get('S3_RESOURCE_OBJECT_KEY').default('resources.json').asString();
    const policyAttachmentsFolderPath = envVar
      .get('S3_POLICY_ATTACHMENTS_KEY_PREFIX')
      .default('policyAttachments/')
      .asString();
    const awsAccessKeyId = envVar.get('S3_AWS_ACCESS_KEY_ID').asString();
    const awsSecretAccessKey = envVar.get('S3_AWS_SECRET_ACCESS_KEY').asString();

    const s3Storage = new S3Storage(bucketName, s3endpoint, awsAccessKeyId, awsSecretAccessKey);
    return new S3ResourceRepository(s3Storage, resourceFilePath, policyAttachmentsFolderPath, options.isRegistry);
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
