import { promises as fs } from 'fs';
import { safeLoadAll } from 'js-yaml';
import loadSchema from './loaders/schema-resource-loader';

const defaultResourceLoader = (x: unknown) => x;

const resourceLoaders: Record<string, (r: any, resourceFile: string) => unknown | Promise<unknown>> = {
  Schema: loadSchema,
};

export default async function (resourceFile: string, resourceTypesToSkip?: string[]) {
  const resourceFileContent = await fs.readFile(resourceFile, { encoding: 'utf8' });
  const resourceContents = safeLoadAll(resourceFileContent);
  const resources: Record<string, any[]> = {};
  for (const resourceWithKind of resourceContents) {
    const { kind, ...resource } = resourceWithKind;
    if (resourceTypesToSkip?.includes(kind)) continue;

    if (!resources[kind]) resources[kind] = [];

    // We don't bother validating the resources, since GraphQL provides a strong enough validation
    // Client-side validation can be added later on to not require a server hop
    const loadedResource = await (resourceLoaders[kind] ?? defaultResourceLoader)(resource, resourceFile);

    resources[kind].push(loadedResource);
  }
  return resources;
}
