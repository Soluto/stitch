import gqlObjects$ from "./sync-service";
import { map, shareReplay, distinctUntilChanged, filter } from "rxjs/operators";
import * as R from "ramda";

const syncUpstreams$ = gqlObjects$.pipe(
  map(x => x.upstreams || {}),
  distinctUntilChanged(R.equals),
  shareReplay(1)
);

// TODO: add endpoint validation

export default syncUpstreams$;
