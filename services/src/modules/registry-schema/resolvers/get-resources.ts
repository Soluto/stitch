import * as _ from 'lodash';
import { ResourceType } from '../types';
import { ResourceGroup, ResourceMetadata } from '../../resource-repository';
import getResourceRepository from '../repository';

const resourcesByType: Record<ResourceType, (rg: ResourceGroup) => unknown> = {
  [ResourceType.Schema]: rg => rg.schemas,
  [ResourceType.Upstream]: rg => rg.upstreams,
  [ResourceType.DefaultUpstream]: rg => rg.defaultUpstream,
  [ResourceType.Policy]: rg => rg.policies,
  [ResourceType.BasePolicy]: rg => rg.basePolicy,
  [ResourceType.IntrospectionQueryPolicy]: rg => rg.introspectionQueryPolicy,
};

export async function getResourcesByType(resourceType: ResourceType, fromGatewayResources = false) {
  const { resourceGroup } = await getResourceRepository(!fromGatewayResources).fetchLatest();
  return resourcesByType[resourceType](resourceGroup);
}

export async function getResource(
  resourceType: ResourceType,
  resourceMetadata: ResourceMetadata,
  fromGatewayResources = false
) {
  const resources = await getResourcesByType(resourceType, fromGatewayResources);
  if (!Array.isArray(resources)) {
    throw new TypeError('Invalid option');
  }
  return resources.find(({ metadata }) => _.isEqual(metadata, resourceMetadata));
}

export async function getRemoteSchemas() {
  const { resourceGroup } = await getResourceRepository(false).fetchLatest();
  return resourceGroup.remoteSchemas ?? [];
}

export async function getRemoteSchema(url: string) {
  const remoteSchemas = await getRemoteSchemas();
  return remoteSchemas.find(s => s.url === url);
}
