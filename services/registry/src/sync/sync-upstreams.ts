import * as R from "ramda";
import { Observable } from "rxjs";
// tslint:disable-next-line:no-submodule-imports
import { distinctUntilChanged, map, shareReplay } from "rxjs/operators";
import { UpstreamConfig } from "./object-types";
import gqlObjects$ from "./sync-service";

const syncUpstreams$ = gqlObjects$.pipe(
    map(x => x.upstreams || {}),
    distinctUntilChanged(R.equals),
    shareReplay(1)
) as Observable<{ [name: string]: UpstreamConfig }>;

// TODO: add Upstream validation

export default syncUpstreams$;
