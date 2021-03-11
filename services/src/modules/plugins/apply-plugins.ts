import { promises as fs } from 'fs';
import { join } from 'path';
import { PluginDefinition } from 'apollo-server-core';
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
        const pluginPath = join(pluginsDir!, name);
        const pluginImport = await import(pluginPath);
        const plugin: Partial<Omit<StitchPlugin, 'name'>> =
          typeof pluginImport === 'function' ? await pluginImport.call() : pluginImport;

        if (plugin.configure) {
          await plugin.configure(pluginsConfig?.[name]);
        }

        const version = await getPluginVersion(pluginPath);

        plugins.push({ name, version, ...plugin });
        logger.info({ name }, `Plugin ${name}@${version} has been loaded successfully.`);
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
  logger.info('Building argument injection globals');
  const globals = await plugins
    .filter(p => p.addArgumentInjectionGlobals)
    .reduce(async (resultPromise, curPlugin) => {
      try {
        logger.debug(
          { plugin: curPlugin.name, method: 'addArgumentInjectionGlobals' },
          `Applying addArgumentInjectionGlobals of ${curPlugin.name} plugin...`
        );
        const resultGlobals = await resultPromise;
        const curPluginGlobals = await curPlugin.addArgumentInjectionGlobals!();

        logger.debug(
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
  logger.debug({ globals: Object.keys(globals) }, 'Argument injection globals were built');
  return globals;
}

export async function transformResourceGroup(resourceGroup: ResourceGroup): Promise<ResourceGroup> {
  logger.info('Applying plugins on resource group.');
  let rg: ResourceGroup = { ...resourceGroup, pluginsData: {} };
  const pluginsToApply = plugins.filter(p => p.transformResourceGroup);
  for (const curPlugin of pluginsToApply) {
    try {
      logger.debug(
        { plugin: curPlugin.name, method: 'transformResourceGroup' },
        `Applying transformResourceGroup of ${curPlugin.name} plugin...`
      );
      rg = await curPlugin.transformResourceGroup!(rg);
      logger.debug(
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
  logger.info('Applying plugins on base schema.');
  let bs: BaseSchema = baseSchema;
  const pluginsToApply = plugins.filter(p => p.transformBaseSchema);
  for (const curPlugin of pluginsToApply) {
    try {
      logger.debug(
        { plugin: curPlugin.name, method: 'transformBaseSchema' },
        `Applying transformBaseSchema of ${curPlugin.name} plugin...`
      );
      bs = await curPlugin.transformBaseSchema!(bs);
      logger.debug(
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

export function transformApolloServerPlugins(baseApolloServerPlugins: PluginDefinition[]): PluginDefinition[] {
  logger.info('Applying plugins on apollo server plugin.');
  let apolloServerPlugins: PluginDefinition[] = baseApolloServerPlugins;
  const pluginsToApply = plugins.filter(p => p.transformApolloServerPlugins);
  for (const curPlugin of pluginsToApply) {
    try {
      logger.debug(
        { plugin: curPlugin.name, method: 'transformApolloServerPlugins' },
        `Applying transformApolloServerPlugins of ${curPlugin.name} plugin...`
      );
      apolloServerPlugins = curPlugin.transformApolloServerPlugins!(apolloServerPlugins);
      logger.debug(
        { plugin: curPlugin.name, method: 'transformApolloServerPlugins' },
        `transformApolloServerPlugins of ${curPlugin.name} plugin was applied successfully.`
      );
    } catch (err) {
      const message = `Plugin "${curPlugin.name}" failed to execute "transformApolloServerPlugins" with error: ${err}`;
      logger.warn({ err, plugin: curPlugin.name, method: 'transformApolloServerPlugins' }, message);
      throw new Error(message);
    }
  }
  return apolloServerPlugins;
}

async function getPluginVersion(path: string) {
  try {
    const pJsonPath = join(path, 'package.json');
    const pJsonContent = await fs.readFile(pJsonPath, { encoding: 'utf8' });
    const pJson = JSON.parse(pJsonContent);
    return (pJson.version ?? 'N/A') as string;
  } catch {
    return 'N/A';
  }
}
