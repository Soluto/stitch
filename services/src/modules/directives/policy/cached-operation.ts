import { isDeepStrictEqual } from 'util';

export default class CachedOperation<KeyType, ResultType> {
  protected operationCache: { key: KeyType; result: ResultType }[] = [];

  // We add the promise of the result to the cache without waiting for the operation to finish executing.
  // This ensures the entire process up to adding the promise to the cache is synchronous.
  // As a result, if two requests happen "simultaneously", the first one will add the promise
  // to the cache and the second one will retrieve the promise from the cache.
  // The operation will be executed only once.
  public getOperationResult(cacheKey: KeyType, executionFunction: () => ResultType) {
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) return cachedResult;

    const result = executionFunction();
    this.addToCache(cacheKey, result);
    return result;
  }

  private getFromCache(key: KeyType): ResultType | undefined {
    const cached = this.operationCache.find(({ key: entryKey }) => isDeepStrictEqual(key, entryKey));
    return cached?.result;
  }

  private addToCache(key: KeyType, result: ResultType) {
    this.operationCache.push({ key, result });
  }
}
