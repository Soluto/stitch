import gqlObjects$ from "./sync-service";
import { map, shareReplay, distinctUntilChanged, filter } from "rxjs/operators";
import * as R from "ramda";
import { Observable } from "rxjs";
import { UpstreamAuthCredentialsConfig } from "./object-types";

const syncUpstreamAuthCredentials$ = gqlObjects$.pipe(
    map(x => x.upstreamclientcredentials || {}),
    distinctUntilChanged(R.equals),
    shareReplay(1)
) as Observable<{ [name: string]: UpstreamAuthCredentialsConfig }>;

// TODO: Add UpstreamAuthCredentials validation

export default syncUpstreamAuthCredentials$;
