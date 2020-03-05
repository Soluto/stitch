import {Observable, interval} from 'rxjs';
import {mergeScan, filter, startWith, distinctUntilChanged} from 'rxjs/operators';
import {ResourceRepository, ResourceGroup} from './types';

function isNonNull<T>(val: T | null): val is T {
    return val !== null;
}

export function pollForUpdates(resourceRepository: ResourceRepository, intervalMs: number): Observable<ResourceGroup> {
    return interval(intervalMs).pipe(
        startWith(0),
        mergeScan(async rg => {
            const newRg = await resourceRepository.fetch(rg?.etag);
            return newRg ?? rg;
        }, null as ResourceGroup | null),
        filter(isNonNull),
        distinctUntilChanged()
    );
}
