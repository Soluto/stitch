import { filter, map, take } from "rxjs/operators";
import {makeExecutableSchema} from "graphql-tools";
import { AgogosObjectConfig, SchemaConfig } from "../../sync/object-types";
import gqlObjects$, { AggObjsByName } from "../../sync/sync-service";
import { stitchSchemas } from "../../graphql/stitch";

export const validateSchemas = (schemas: AggObjsByName) => {
    const stitchedSchema = stitchSchemas(schemas);
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
