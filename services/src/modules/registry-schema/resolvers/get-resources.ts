import * as _ from 'lodash';
import { ResourceType } from '..';
import { ResourceMetadata } from '../../resource-repository';
import getResourceRepository from '../repository';

export async function getResourcesByType(resourceType: ResourceType, fromGatewayResources = false) {
  const { resourceGroup } = await getResourceRepository(!fromGatewayResources).fetchLatest();
  switch (resourceType) {
    case ResourceType.Schema:
      return resourceGroup.schemas;

    case ResourceType.Upstream:
      return resourceGroup.upstreams;

    case ResourceType.DefaultUpstream:
      return resourceGroup.defaultUpstream;

    case ResourceType.Policy:
      return resourceGroup.policies;

    case ResourceType.BasePolicy:
      return resourceGroup.basePolicy;
  }
}

export async function getResource(
  resourceType: ResourceType,
  resourceMetadata: ResourceMetadata,
  fromGatewayResources = false
) {
  const { resourceGroup } = await getResourceRepository(!fromGatewayResources).fetchLatest();
  switch (resourceType) {
    case ResourceType.Schema:
      return resourceGroup.schemas.find(({ metadata }) => _.isEqual(metadata, resourceMetadata));

    case ResourceType.Upstream:
      return resourceGroup.upstreams.find(({ metadata }) => _.isEqual(metadata, resourceMetadata));

    case ResourceType.DefaultUpstream:
      throw new Error('Invalid option');

    case ResourceType.Policy:
      return resourceGroup.policies.find(({ metadata }) => _.isEqual(metadata, resourceMetadata));

    case ResourceType.BasePolicy:
      throw new Error('Invalid option');
  }
}
