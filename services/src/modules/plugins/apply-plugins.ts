import { promises as fs } from 'fs';
import { join } from 'path';
import { BaseSchema } from '../base-schema';
import { pluginsDir, pluginsConfig } from '../config';
import logger from '../logger';
import { ResourceGroup } from '../resource-repository';
import { StitchPlugin, ValueOrPromise } from './types';

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

        if (plugin.configure) {
          await plugin.configure(pluginsConfig?.[name]);
        }

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
  const globals = await plugins
    .filter(p => p.addArgumentInjectionGlobals)
    .reduce(async (resultPromise, curPlugin) => {
      const resultGlobals = await resultPromise;
      const curPluginGlobals = await curPlugin.addArgumentInjectionGlobals!();
      return { ...resultGlobals, ...curPluginGlobals };
    }, Promise.resolve({}));
  return globals;
}

export async function transformResourceGroup(resourceGroup: ResourceGroup): Promise<ResourceGroup> {
  return plugins
    .filter(p => p.transformResourceGroup)
    .reduce<ValueOrPromise<ResourceGroup>>(async (res, cur) => cur.transformResourceGroup!(await res), resourceGroup);
}

export async function transformBaseSchema(baseSchema: BaseSchema): Promise<BaseSchema> {
  return plugins
    .filter(p => p.transformBaseSchema)
    .reduce<ValueOrPromise<BaseSchema>>(async (res, cur) => cur.transformBaseSchema!(await res), baseSchema);
}
