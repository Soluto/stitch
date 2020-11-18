import * as path from 'path';
import pLimit from 'p-limit';
import { Storage, listFilesItem } from '../storage';
import { getWasmPolicy } from '../directives/policy/opa';
import { FetchLatestResult, ResourceGroup, IResourceRepository, PolicyAttachments, UpdateOptions } from '.';

export class ResourceRepository implements IResourceRepository {
  protected resourceGroup?: { lastModified?: Date; resources: ResourceGroup };
  protected policyAttachments: { attachments: PolicyAttachments; refreshedAt?: Date } = { attachments: {} };

  constructor(
    protected storage: Storage,
    protected resourceFilePath: string,
    protected policyAttachmentsFolderPath: string,
    protected isRegistry = false,
    protected registryResourceFilePath?: string
  ) {}

  async fetchLatest(): Promise<FetchLatestResult> {
    const resourceFilePath = this.isRegistry ? this.registryResourceFilePath! : this.resourceFilePath;
    const stats = await this.storage.fileStats(resourceFilePath);

    if (this.resourceGroup?.lastModified?.getTime() === stats.lastModified.getTime()) {
      await this.refreshPolicyAttachments();
      this.resourceGroup.resources.policyAttachments = { ...this.policyAttachments.attachments };

      return { isNew: false, resourceGroup: this.resourceGroup.resources };
    }

    const { content } = await this.storage.readFile(resourceFilePath, { asString: true });
    const resources = JSON.parse(content) as ResourceGroup;
    this.resourceGroup = { lastModified: stats.lastModified, resources };

    await this.refreshPolicyAttachments();
    this.resourceGroup.resources.policyAttachments = { ...this.policyAttachments.attachments };

    return { isNew: true, resourceGroup: resources };
  }

  async update(resources: ResourceGroup, options?: UpdateOptions): Promise<void> {
    const defaultOptions = { registry: false };
    const { registry } = { ...defaultOptions, ...options };
    const resourceFilePath = registry ? this.registryResourceFilePath! : this.resourceFilePath;

    await this.storage.writeFile(resourceFilePath, JSON.stringify(resources));
  }

  async writePolicyAttachment(filename: string, content: Buffer): Promise<void> {
    const filePath = path.join(this.policyAttachmentsFolderPath, filename);
    await this.storage.writeFile(filePath, content);
  }

  protected async refreshPolicyAttachments() {
    if (this.isRegistry) return;
    const newRefreshedAt = new Date();

    const allAttachments = await this.listPolicyAttachments();
    const attachmentsToRefresh = allAttachments.filter(a => this.shouldRefreshPolicyAttachment(a)).map(a => a.filePath);

    if (attachmentsToRefresh.length > 0) {
      const newAttachments = await this.getPolicyAttachments(attachmentsToRefresh);

      for (const { filename, content } of newAttachments) {
        this.policyAttachments.attachments[filename] = await getWasmPolicy(content);
      }
    }

    this.policyAttachments.refreshedAt = newRefreshedAt;
  }

  protected async listPolicyAttachments() {
    return this.storage.listFiles(this.policyAttachmentsFolderPath);
  }

  protected shouldRefreshPolicyAttachment({ filePath, lastModified }: listFilesItem): boolean {
    const filename = path.basename(filePath);

    if (!this.policyAttachments.attachments[filename]) return true;
    if (!this.policyAttachments.refreshedAt) return true;

    return lastModified > this.policyAttachments.refreshedAt;
  }

  protected async getPolicyAttachments(filePaths: string[]): Promise<{ filename: string; content: Buffer }[]> {
    const limit = pLimit(10);

    return Promise.all(
      filePaths.map(filePath => {
        return limit(async () => {
          const { content } = await this.storage.readFile(filePath);
          const filename = path.basename(filePath);

          return { filename, content };
        });
      })
    );
  }
}
