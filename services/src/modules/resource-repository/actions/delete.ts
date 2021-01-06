import { ResourceGroup, Resource, ResourceMetadata, ResourceGroupMetadata } from '..';

export function applyResourceDeletions<TResource extends Resource, TResourceMetadata extends ResourceMetadata>(
  resources: TResource[] = [],
  deletions?: TResourceMetadata[]
): TResource[] {
  if (deletions === undefined) {
    return resources;
  }

  const newResources = resources.filter(
    r => !deletions.some(d => r.metadata.name === d.name && r.metadata.namespace === d.namespace)
  );

  return newResources;
}

export default function applyResourceGroupDeletions(
  rg: ResourceGroup,
  deletions: Partial<ResourceGroupMetadata>
): ResourceGroup {
  const newRg: ResourceGroup = { ...rg };

  if (typeof deletions.schemas !== 'undefined') {
    newRg.schemas = applyResourceDeletions(newRg.schemas, deletions.schemas);
  }

  if (typeof deletions.upstreams !== 'undefined') {
    newRg.upstreams = applyResourceDeletions(newRg.upstreams, deletions.upstreams);
  }

  if (typeof deletions.upstreamClientCredentials !== 'undefined') {
    newRg.upstreamClientCredentials = applyResourceDeletions(
      newRg.upstreamClientCredentials,
      deletions.upstreamClientCredentials
    );
  }

  if (typeof deletions.policies !== 'undefined') {
    newRg.policies = applyResourceDeletions(newRg.policies, deletions.policies);
  }

  if (deletions.basePolicy) {
    newRg.basePolicy = undefined;
  }

  if (deletions.defaultUpstream) {
    newRg.defaultUpstream = undefined;
  }

  return newRg;
}
