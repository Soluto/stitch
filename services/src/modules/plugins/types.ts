import { PluginDefinition } from 'apollo-server-core';
import { BaseSchema } from '../base-schema';
import { ResourceGroup } from '../resource-repository';

export type ValueOrPromise<T> = T | Promise<T>;

export interface PluginMetadata {
  name: string;
  version: string;
}

export interface StitchPlugin {
  name: string;

  version: string;

  configure?(options?: unknown): ValueOrPromise<void>;

  addArgumentInjectionGlobals?(): ValueOrPromise<Record<string, unknown>>;

  transformResourceGroup?(resourceGroup: ResourceGroup): ValueOrPromise<ResourceGroup>;

  transformBaseSchema?(baseSchema: BaseSchema): ValueOrPromise<BaseSchema>;

  transformApolloServerPlugins?(plugins: PluginDefinition[]): PluginDefinition[];
}
