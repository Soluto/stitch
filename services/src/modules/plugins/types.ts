import { ResourceGroup } from '../resource-repository';

export type ValueOrPromise<T> = T | Promise<T>;

export interface StitchPlugin {
  name: string;

  addArgumentInjectionGlobals?(): ValueOrPromise<Record<string, unknown>>;

  transformResourceGroup?(resourceGroup: ResourceGroup): ValueOrPromise<ResourceGroup>;
}
