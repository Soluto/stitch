import * as R from "ramda";
import { Observable } from "rxjs";
// tslint:disable-next-line:no-submodule-imports
import { distinctUntilChanged, map, shareReplay } from "rxjs/operators";
import { IUpstreamAuthCredentialsConfig } from "./object-types";
import gqlObjects$ from "./sync-service";

const syncUpstreamAuthCredentials$ = gqlObjects$.pipe(
    map(x => x.upstreamclientcredentials || {}),
    distinctUntilChanged(R.equals),
    shareReplay(1)
) as Observable<{ [name: string]: IUpstreamAuthCredentialsConfig }>;

// TODO: Add UpstreamAuthCredentials validation

export default syncUpstreamAuthCredentials$;
