import { take } from "rxjs/operators";

import { schemas$ } from "../sync/sync-service";
import { makeGqlDocumentFromGqlSources } from "../graphql/create-schema";

const validateSchema = async (
    source: string,
    name: string,
    definition: string
) => {
    const schemas = await schemas$.pipe(take(1)).toPromise();
    schemas[`${source}.${name}`] = definition;
    makeGqlDocumentFromGqlSources(schemas);
};

export default validateSchema;