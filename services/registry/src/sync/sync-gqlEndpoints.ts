import gqlObjects$ from "./sync-service";
import { map, shareReplay, distinctUntilChanged, filter } from "rxjs/operators";


const syncEndpoint$ = gqlObjects$.pipe(
    map(x => x.gqlendpoints),
    filter(a => a && Object.keys(a).length > 0),
    distinctUntilChanged(),
    shareReplay(1)
);

// TODO: add endpoint validation

export default syncEndpoint$;