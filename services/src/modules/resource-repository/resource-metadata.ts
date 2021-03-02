import * as crypto from 'crypto';
import { getPlugins } from '../plugins';
import { ResourceGroup, ResourcesMetadata, UpdateOptions } from './types';

export default function buildResourcesMetadata(
  resources: ResourceGroup,
  resourceFileContent: string,
  options?: UpdateOptions
) {
  const hash = crypto.createHash('md5');
  const checksum = hash.update(resourceFileContent, 'utf8').digest('hex');

  const summary = Object.fromEntries(
    Object.entries(resources).map(([resourceType, resources]) => [
      resourceType,
      Array.isArray(resources) ? resources.length : 1,
    ])
  );

  const result: ResourcesMetadata = {
    checksum,
    summary,
  };

  if (!options || !options.registry) {
    result.plugins = getPlugins();
  }

  return JSON.stringify(result, undefined, 4);
}
