import { Observable, interval } from 'rxjs';
import { filter, startWith, distinctUntilChanged, mergeMap } from 'rxjs/operators';
import { resourceUpdateInterval } from '../config';
import { getResourceRepository, ResourceGroup } from '.';

function isDefined<T>(val: T | undefined): val is T {
  return val !== undefined;
}

export function pollForUpdates(): Observable<ResourceGroup> {
  const resourceRepository = getResourceRepository();
  return interval(resourceUpdateInterval).pipe(
    startWith(0),
    mergeMap(async () => {
      const { isNew, resourceGroup } = await resourceRepository.fetchLatest();

      return isNew ? resourceGroup : undefined;
    }),
    filter(isDefined),
    distinctUntilChanged()
  );
}
