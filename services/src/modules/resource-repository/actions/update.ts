import { ResourceGroup, Resource } from '..';

export function applyResourceUpdates<TResource extends Resource>(
  resources: TResource[] = [],
  updates?: TResource[]
): TResource[] {
  if (updates === undefined) {
    return resources;
  }

  const newResources = resources.slice();

  for (const resourceUpdate of updates) {
    const existingResourceIndex = newResources.findIndex(
      existing =>
        existing.metadata.name === resourceUpdate.metadata.name &&
        existing.metadata.namespace === resourceUpdate.metadata.namespace
    );

    if (existingResourceIndex === -1) {
      newResources.push(resourceUpdate);
    } else {
      newResources[existingResourceIndex] = resourceUpdate;
    }
  }

  return newResources;
}

export default function applyResourceGroupUpdates(rg: ResourceGroup, update: Partial<ResourceGroup>): ResourceGroup {
  const newRg: ResourceGroup = { ...rg };

  if (typeof update.schemas !== 'undefined') {
    newRg.schemas = applyResourceUpdates(newRg.schemas, update.schemas);
  }

  if (typeof update.upstreams !== 'undefined') {
    newRg.upstreams = applyResourceUpdates(newRg.upstreams, update.upstreams);
  }

  if (typeof update.upstreamClientCredentials !== 'undefined') {
    newRg.upstreamClientCredentials = applyResourceUpdates(
      newRg.upstreamClientCredentials,
      update.upstreamClientCredentials
    );
  }

  if (typeof update.policies !== 'undefined') {
    newRg.policies = applyResourceUpdates(newRg.policies, update.policies);
  }

  if (typeof update.basePolicy !== 'undefined') {
    newRg.basePolicy = update.basePolicy;
  }

  return newRg;
}
