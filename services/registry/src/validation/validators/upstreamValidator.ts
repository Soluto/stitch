import { take, map, filter } from "rxjs/operators";

import gqlObjects$ from "../../sync/sync-service";
import { AgogosObjectConfig, UpstreamConfig } from "../../sync/object-types";

const validateUpstream = async (
    source: string,
    name: string,
    spec: AgogosObjectConfig
): Promise<void> => {
    const upstreams = await gqlObjects$
        .pipe(
            map(x => x.upstreams || {}),
            take(1)
        )
        .toPromise();
    const newUpstreams = { ...upstreams, [`${source}.${name}`]: spec };
    const hosts = Object.values(newUpstreams).map((u: UpstreamConfig) => u.host);
    if (hosts.length !== (new Set(hosts)).size) {
        throw new Error("Duplicate hosts found.");
    }
};

export default validateUpstream;
