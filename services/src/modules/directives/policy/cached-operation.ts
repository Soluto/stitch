import { isDeepStrictEqual } from 'util';

export default abstract class CachedOperation<KeyType, ResultType> {
  protected operationCache: { key: KeyType; result: Promise<ResultType> }[] = [];

  // We add the promise of the result to the cache without waiting for the operation to finish executing.
  // This ensures the entire process up to adding the promise to the cache is synchronous.
  // As a result, if two requests happen "simultaneously", the first one will add the promise
  // to the cache and the second one will retrieve the promise from the cache.
  // The operation will be executed only once.
  protected async getOperationResult(cacheKey: KeyType, executionFunction: () => Promise<ResultType>) {
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) return cachedResult;

    const resultPromise = executionFunction();
    this.addToCache(cacheKey, resultPromise);
    return resultPromise;
  }

  private getFromCache(key: KeyType): Promise<ResultType> | undefined {
    const cached = this.operationCache.find(({ key: entryKey }) => isDeepStrictEqual(key, entryKey));
    return cached?.result;
  }

  private addToCache(key: KeyType, result: Promise<ResultType>) {
    this.operationCache.push({ key, result });
  }
}
