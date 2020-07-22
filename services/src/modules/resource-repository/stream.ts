import { Observable, interval } from 'rxjs';
import { filter, startWith, distinctUntilChanged, mergeMap } from 'rxjs/operators';
import { IResourceRepository, ResourceGroup } from '.';

function isDefined<T>(val: T | undefined): val is T {
  return val !== undefined;
}

export function pollForUpdates(resourceRepository: IResourceRepository, intervalMs: number): Observable<ResourceGroup> {
  return interval(intervalMs).pipe(
    startWith(0),
    mergeMap(async () => {
      const { isNew, resourceGroup } = await resourceRepository.fetchLatest();

      return isNew ? resourceGroup : undefined;
    }),
    filter(isDefined),
    distinctUntilChanged()
  );
}
