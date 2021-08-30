import * as envVar from 'env-var';
import { S3Storage } from '../storage';
import { FetchLatestResult, ResourceGroup, ResourceRepository } from '.';

export class S3ResourceRepository extends ResourceRepository {
  protected resourceGroup?: { etag: string; resources: ResourceGroup };

  constructor(
    protected storage: S3Storage,
    protected resourceFilePath: string,
    protected policyAttachmentsFolderPath: string,
    protected isRegistry = false,
    protected registryResourceFilePath?: string
  ) {
    super(storage, resourceFilePath, policyAttachmentsFolderPath, isRegistry, registryResourceFilePath);
  }

  async fetchLatest(): Promise<FetchLatestResult> {
    let content: string, etag: string;
    const resourceFilePath = this.isRegistry ? this.registryResourceFilePath! : this.resourceFilePath;

    try {
      ({ content, etag } = await this.storage.readFile(resourceFilePath, {
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
    this.resourceGroup.resources.policyAttachments = { ...this.policyAttachments.attachments };

    return { isNew: true, resourceGroup: resources };
  }

  static fromEnvironment({ isRegistry = false } = {}) {
    const s3endpoint = envVar.get('S3_ENDPOINT').required().asString();
    const bucketName = envVar.get('S3_RESOURCE_BUCKET_NAME').required().asString();
    const resourceFilePath = envVar.get('S3_RESOURCE_OBJECT_KEY').default('resources-gateway.json').asString();

    let registryResourceEnvVar = envVar.get('S3_REGISTRY_RESOURCE_OBJECT_KEY');
    if (isRegistry) registryResourceEnvVar = registryResourceEnvVar.default('resources-registry.json');
    const registryResourceFilePath = registryResourceEnvVar.asString();

    const policyAttachmentsFolderPath = envVar
      .get('S3_POLICY_ATTACHMENTS_KEY_PREFIX')
      .default('policyAttachments/')
      .asString();
    const awsAccessKeyId = envVar.get('S3_AWS_ACCESS_KEY_ID').asString();
    const awsSecretAccessKey = envVar.get('S3_AWS_SECRET_ACCESS_KEY').asString();

    const s3Storage = new S3Storage(bucketName, s3endpoint, awsAccessKeyId, awsSecretAccessKey);
    return new S3ResourceRepository(
      s3Storage,
      resourceFilePath,
      policyAttachmentsFolderPath,
      isRegistry,
      registryResourceFilePath
    );
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
