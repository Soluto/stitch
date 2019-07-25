import gqlObjects$ from "./sync-service";
import { map, shareReplay, distinctUntilChanged, filter } from "rxjs/operators";
import * as R from "ramda";
import { Observable } from "rxjs";
import { UpstreamConfig } from "./object-types";

const syncUpstreams$ = gqlObjects$.pipe(
    map(x => x.upstreams || {}),
    distinctUntilChanged(R.equals),
    shareReplay(1)
) as Observable<{ [name: string]: UpstreamConfig }>;

// TODO: add Upstream validation

export default syncUpstreams$;
