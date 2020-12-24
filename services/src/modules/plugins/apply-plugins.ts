import { promises as fs } from 'fs';
import { join } from 'path';
import { BaseSchema } from '../base-schema';
import { pluginsDir, pluginsConfig } from '../config';
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
      try {
        logger.trace(
          { plugin: curPlugin.name, method: 'addArgumentInjectionGlobals' },
          `Applying addArgumentInjectionGlobals of ${curPlugin.name} plugin...`
        );
        const resultGlobals = await resultPromise;
        const curPluginGlobals = await curPlugin.addArgumentInjectionGlobals!();

        logger.trace(
          { plugin: curPlugin.name, method: 'addArgumentInjectionGlobals' },
          `addArgumentInjectionGlobals of ${curPlugin.name} plugin was applied successfully.`
        );

        return { ...resultGlobals, ...curPluginGlobals };
      } catch (err) {
        const message = `Plugin "${curPlugin.name}" failed to execute "addArgumentInjectionGlobals" with error: ${err}`;
        logger.warn({ err, plugin: curPlugin.name, method: 'addArgumentInjectionGlobals' }, message);
        throw new Error(message);
      }
    }, Promise.resolve({}));
  return globals;
}

export async function transformResourceGroup(resourceGroup: ResourceGroup): Promise<ResourceGroup> {
  let rg: ResourceGroup = resourceGroup;
  const pluginsToApply = plugins.filter(p => p.transformResourceGroup);
  for (const curPlugin of pluginsToApply) {
    try {
      logger.trace(
        { plugin: curPlugin.name, method: 'transformResourceGroup' },
        `Applying transformResourceGroup of ${curPlugin.name} plugin...`
      );
      rg = await curPlugin.transformResourceGroup!(rg);
      logger.trace(
        { plugin: curPlugin.name, method: 'transformResourceGroup' },
        `transformResourceGroup of ${curPlugin.name} plugin was applied successfully.`
      );
    } catch (err) {
      const message = `Plugin "${curPlugin.name}" failed to execute "transformResourceGroup" with error: ${err}`;
      logger.warn({ err, plugin: curPlugin.name, method: 'transformResourceGroup' }, message);
      throw new Error(message);
    }
  }
  return rg;
}

export async function transformBaseSchema(baseSchema: BaseSchema): Promise<BaseSchema> {
  let bs: BaseSchema = baseSchema;
  const pluginsToApply = plugins.filter(p => p.transformBaseSchema);
  for (const curPlugin of pluginsToApply) {
    try {
      logger.trace(
        { plugin: curPlugin.name, method: 'transformBaseSchema' },
        `Applying transformBaseSchema of ${curPlugin.name} plugin...`
      );
      bs = await curPlugin.transformBaseSchema!(bs);
      logger.trace(
        { plugin: curPlugin.name, method: 'transformBaseSchema' },
        `transformBaseSchema of ${curPlugin.name} plugin was applied successfully.`
      );
    } catch (err) {
      const message = `Plugin "${curPlugin.name}" failed to execute "transformBaseSchema" with error: ${err}`;
      logger.warn({ err, plugin: curPlugin.name, method: 'transformBaseSchema' }, message);
      throw new Error(message);
    }
  }
  return bs;
}
