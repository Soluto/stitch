// tslint:disable-next-line:no-submodule-imports
import { map, take } from "rxjs/operators";

import { AgogosObjectConfig, IUpstreamAuthCredentialsConfig } from "../../sync/object-types";
import gqlObjects$ from "../../sync/sync-service";

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
    const uccs = Object.values(newUpstreamClientCredentials).map((u: IUpstreamAuthCredentialsConfig) => `${u.authType}||${u.authority}||${u.clientId}`);
    if (uccs.length !== (new Set(uccs)).size) {
        throw new Error("Duplicate upstream client credentials found.");
    }
};

export default validateUpstreamClientCredentials;
