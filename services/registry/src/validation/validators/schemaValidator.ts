// tslint:disable-next-line:no-submodule-imports
import { filter, map, take } from "rxjs/operators";

import { AgogosObjectConfig } from "../../sync/object-types";
import { makeGqlDocumentFromGqlSources } from "../../sync/sync-schemas";
import gqlObjects$ from "../../sync/sync-service";

const validateSchema = async (
    source: string,
    name: string,
    spec: AgogosObjectConfig
): Promise<void> => {
    const schemas = await gqlObjects$
        .pipe(
            map(x => x.schemas || {}),
            take(1)
        )
        .toPromise();
    const newSchemas = { ...schemas, [`${source}.${name}`]: spec };
    makeGqlDocumentFromGqlSources(newSchemas);
};

export default validateSchema;
