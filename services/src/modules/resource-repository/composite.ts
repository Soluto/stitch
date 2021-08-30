import { listFilesItem } from '../storage';
import {
  FetchLatestResult,
  IResourceRepository,
  applyResourceGroupUpdates,
  ResourceRepository,
  ResourcesMetadata,
} from '.';

export class CompositeResourceRepository implements IResourceRepository {
  constructor(protected repositories: ResourceRepository[]) {}

  async fetchLatest(): Promise<FetchLatestResult> {
    const results = await Promise.all(this.repositories.map(repo => repo.fetchLatest()));

    return results.reduce((res1, res2) => ({
      isNew: res1.isNew || res2.isNew,
      resourceGroup: applyResourceGroupUpdates(res1.resourceGroup, res2.resourceGroup),
    }));
  }

  async fetchMetadata(): Promise<ResourcesMetadata> {
    throw new Error('Multiplexed resource repository cannot return metadata');
  }

  async listPolicyAttachments(): Promise<listFilesItem[]> {
    throw new Error('Multiplexed resource repository cannot list Policy Attachments');
  }

  async update(): Promise<void> {
    throw new Error('Multiplexed resource repository cannot handle updates');
  }

  async writePolicyAttachment(): Promise<void> {
    throw new Error('Multiplexed resource repository cannot handle updates');
  }

  async deletePolicyAttachment(): Promise<void> {
    throw new Error('Multiplexed resource repository cannot handle updates');
  }
}
