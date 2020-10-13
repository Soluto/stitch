import { promises as fs } from 'fs';
import { join } from 'path';
import { pluginsDir } from '../config';
import logger from '../logger';
import { ResourceGroup } from '../resource-repository';
import { StitchPlugin } from './types';

export const plugins: StitchPlugin[] = [];
export let argumentInjectionGlobals: Record<string, unknown> = {};

export async function loadPlugins() {
  if (!pluginsDir) return;
  const pluginList = await fs.readdir(pluginsDir);

  await Promise.all(
    pluginList.map(async name => {
      try {
        const pluginImport = await import(join(pluginsDir!, name));
        const plugin: Partial<Omit<StitchPlugin, 'name'>> =
          typeof pluginImport === 'function' ? await pluginImport.call() : pluginImport;
        plugins.push({ name, ...plugin });
        logger.info({ name }, `Plugin ${name} has been loaded successfully.`);
      } catch (err) {
        logger.error({ err, name }, 'Failed to load plugin');
        throw err;
      }
    })
  );

  try {
    argumentInjectionGlobals = await buildArgumentInjectionGlobals();
  } catch (err) {
    logger.error({ err }, 'Failed to build argument injection globals');
    throw err;
  }
}

export async function buildArgumentInjectionGlobals(): Promise<Record<string, unknown>> {
  return plugins
    .filter(p => p.addArgumentInjectionGlobals)
    .reduce(async (acc, cur) => ({ ...acc, ...(await cur.addArgumentInjectionGlobals!()) }), {});
}

export async function transformResourcesUpdates(
  resourceGroup: Partial<ResourceGroup>
): Promise<Partial<ResourceGroup>> {
  return plugins
    .filter(p => p.transformResourcesUpdates)
    .reduce<Partial<ResourceGroup> | Promise<Partial<ResourceGroup>>>(
      async (res, cur) => cur.transformResourcesUpdates!(await res),
      resourceGroup
    );
}

export async function transformResourceGroup(resourceGroup: ResourceGroup): Promise<ResourceGroup> {
  return plugins
    .filter(p => p.transformResourceGroup)
    .reduce<ResourceGroup | Promise<ResourceGroup>>(
      async (res, cur) => cur.transformResourceGroup!(await res),
      resourceGroup
    );
}
