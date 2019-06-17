import gqlObjects$ from "./sync-service";
import { map, shareReplay, distinctUntilChanged, filter } from "rxjs/operators";


const syncAuthProvider$ = gqlObjects$.pipe(
    map(x => x.gqlauthproviders),
    filter(a => a && Object.keys(a).length > 0),
    distinctUntilChanged(),
    shareReplay(1)
);

// TODO: Add auth providers validation

export default syncAuthProvider$;