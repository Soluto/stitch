import { take, map, filter } from "rxjs/operators";

import gqlObjects$ from "../../sync/sync-service";
import { AgogosObjectConfig, UpstreamAuthCredentialsConfig } from "../../sync/object-types";

const validateUpstreamClientCredentials = async (
    source: string,
    name: string,
    spec: AgogosObjectConfig
): Promise<void> => {
    const upstreamClientCredentials = await gqlObjects$
        .pipe(
            map(x => x.upstreamclientcredentials || {}),
            take(1)
        )
        .toPromise();
    const newUpstreamClientCredentials = { ...upstreamClientCredentials, [`${source}.${name}`]: spec };
    const uccs = Object.values(newUpstreamClientCredentials).map((u: UpstreamAuthCredentialsConfig) => `${u.authType}||${u.authority}||${u.clientId}`);
    if (uccs.length !== (new Set(uccs)).size) {
        throw new Error("Duplicate upstream client credentials found.");
    }
};

export default validateUpstreamClientCredentials;
