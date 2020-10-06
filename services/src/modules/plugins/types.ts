import { ResourceGroup } from '../resource-repository';

export type ValueOrPromise<T> = T | Promise<T>;

export interface StitchPlugin {
  name: string;

  addArgumentInjectionGlobals?(): ValueOrPromise<Record<string, unknown>>;

  transformResourcesUpdates?(resourcesUpdates: Partial<ResourceGroup>): ValueOrPromise<Partial<ResourceGroup>>;
  transformResourceGroup?(resourceGroup: ResourceGroup): ValueOrPromise<ResourceGroup>;
}
