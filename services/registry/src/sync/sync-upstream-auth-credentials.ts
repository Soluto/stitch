import gqlObjects$ from "./sync-service";
import { map, shareReplay, distinctUntilChanged, filter } from "rxjs/operators";
import * as R from "ramda";

const syncUpstreamAuthCredentials$ = gqlObjects$.pipe(
  map(x => x.upstreamAuthCredentials || {}),
  distinctUntilChanged(R.equals),
  shareReplay(1)
);

// TODO: Add auth providers validation

export default syncUpstreamAuthCredentials$;
