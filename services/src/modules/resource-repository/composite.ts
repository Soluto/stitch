import {ResourceRepository, FetchLatestResult, ResourceGroup} from './types';
import {applyResourceGroupUpdates} from './updates';

export class CompositeResourceRepository implements ResourceRepository {
    constructor(protected repositories: ResourceRepository[]) {}

    async fetchLatest(): Promise<FetchLatestResult> {
        const results = await Promise.all(this.repositories.map(repo => repo.fetchLatest()));

        return results.reduce((res1, res2) => ({
            isNew: res1.isNew || res2.isNew,
            resourceGroup: applyResourceGroupUpdates(res1.resourceGroup, res2.resourceGroup),
        }));
    }

    getResourceGroup(): ResourceGroup {
        const rgs = this.repositories.map(r => r.getResourceGroup());

        return rgs.reduce((rg1, rg2) => applyResourceGroupUpdates(rg1, rg2));
    }

    async update(): Promise<void> {
        throw new Error('Multiplexed resource repository cannot handle updates');
    }

    async writePolicyAttachment(): Promise<void> {
        throw new Error('Multiplexed resource repository cannot handle updates');
    }

    public getPolicyAttachment(filename: string): Buffer {
        for (const repo of this.repositories) {
            const policyAttachment = repo.getPolicyAttachment(filename);
            if (policyAttachment) return policyAttachment;
        }

        throw new Error(`Policy attachment with the filename ${filename} was not found`);
    }

    public async initializePolicyAttachments() {
        await Promise.all(this.repositories.map(repo => repo.initializePolicyAttachments()));
    }
}
