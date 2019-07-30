import { take, map, filter } from "rxjs/operators";

import gqlObjects$ from "../../sync/sync-service";
import { makeGqlDocumentFromGqlSources } from "../../sync/sync-schemas";
import { AgogosObjectConfig } from "../../sync/object-types";

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
