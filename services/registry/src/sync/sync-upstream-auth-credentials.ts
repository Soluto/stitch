import gqlObjects$ from "./sync-service";
import { map, shareReplay, distinctUntilChanged, filter } from "rxjs/operators";
import * as R from "ramda";

const syncUpstreamAuthCredentials$ = gqlObjects$.pipe(
  map(x => x.upstreamAuthCredentials || {}),
  distinctUntilChanged(R.equals),
  shareReplay(1)
);

// TODO: Add UpstreamAuthCredentials validation

export default syncUpstreamAuthCredentials$;
