export type ValueOrPromise<T> = T | Promise<T>;

export interface StitchPlugin {
  name: string;

  addArgumentInjectionGlobals?(): ValueOrPromise<Record<string, unknown>>;
}
