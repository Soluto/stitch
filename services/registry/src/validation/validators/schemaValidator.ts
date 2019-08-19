import { filter, map, take } from "rxjs/operators";
import {makeExecutableSchema} from "graphql-tools";
import { AgogosObjectConfig, SchemaConfig } from "../../sync/object-types";
import { makeGqlDocumentFromGqlSources } from "../../sync/sync-schemas";
import gqlObjects$, { AggObjsByName } from "../../sync/sync-service";

export const validateSchemas = (schemas: AggObjsByName<SchemaConfig>) => {
    const stitchedSchema = makeGqlDocumentFromGqlSources(schemas);
    makeExecutableSchema({
        typeDefs: stitchedSchema,
    });
};

export const validateSchemaWithLatest = async (
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
    validateSchemas(newSchemas);
};
