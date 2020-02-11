import {ResourceGroup, ResourceRepository, applyResourceGroupUpdates} from '.';
import {enableLocalResourceRepository, enableS3ResourceRepository} from '../config';
import {S3ResourceRepository} from './s3';
import {LocalResourceRepository} from './local';

function initRepos(): ResourceRepository[] {
    let repos = [];
    if (enableS3ResourceRepository) {
        repos.push(new S3ResourceRepository());
    }

    if (enableLocalResourceRepository) {
        repos.push(new LocalResourceRepository());
    }
    return repos;
}

export function fetchAll(): Promise<ResourceGroup>;
export function fetchAll(currentEtag?: string): Promise<ResourceGroup | null>;
export async function fetchAll(currentEtag?: string): Promise<ResourceGroup | null> {
    const repos = initRepos();
    const resources = await Promise.all(repos.map(repo => repo.fetch(currentEtag)));
    if (resources.length == 0) return null;
    let newRg: ResourceGroup = {schemas: [], upstreams: [], upstreamClientCredentials: []};

    for (const rg of resources) {
        if (rg != null) {
            newRg = applyResourceGroupUpdates(newRg, rg);
        }
    }

    return newRg;
}

export async function updateAll(rg: ResourceGroup): Promise<void> {
    const repos = initRepos();
    await Promise.all(repos.map(repo => repo.update(rg)));
}
