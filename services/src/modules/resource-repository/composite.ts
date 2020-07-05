import { ResourceRepository, FetchLatestResult } from './types';
import { applyResourceGroupUpdates } from './updates';

export class CompositeResourceRepository implements ResourceRepository {
  constructor(protected repositories: ResourceRepository[]) {}

  async fetchLatest(): Promise<FetchLatestResult> {
    const results = await Promise.all(this.repositories.map(repo => repo.fetchLatest()));

    return results.reduce((res1, res2) => ({
      isNew: res1.isNew || res2.isNew,
      resourceGroup: applyResourceGroupUpdates(res1.resourceGroup, res2.resourceGroup),
    }));
  }

  async update(): Promise<void> {
    throw new Error('Multiplexed resource repository cannot handle updates');
  }

  async writePolicyAttachment(): Promise<void> {
    throw new Error('Multiplexed resource repository cannot handle updates');
  }
}
