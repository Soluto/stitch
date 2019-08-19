import { distinctUntilChanged, filter, map, shareReplay } from "rxjs/operators";

import gqlObjects$, { AggObjsByName } from "./sync-service";

import { DocumentNode, parse, print } from "graphql";
import { mergeDocuments } from "../graphql/schema-utils";
import { SchemaConfig } from "./object-types";
import {validateSchemas} from "../validation/validators/schemaValidator";
import logger from "../logger";

function parseGqlSource(schemaName: string, schema: string) {
    try {
        return parse(schema);
    } catch (e) {
        throw {
            error: e,
            message: `Failed to load schema for source -  ${schemaName} - ${
                e.message
                }`,
            schema: { schemaName, schema },
        };
    }
}

function mergeAllDocuments(docs: DocumentNode[]) {
    try {
        return mergeDocuments(docs);
    } catch (e) {
        throw {
            error: e,
            message: `Failed to merge schemas - ${e.message}`,
            schemas: docs,
        };
    }
}

export const makeGqlDocumentFromGqlSources = (gqlSchemas: AggObjsByName) => {
    const documentNodes = Object.entries(gqlSchemas).map(
        ([schemaName, schema]: [string, SchemaConfig]) =>
            parseGqlSource(schemaName, schema.definition)
    );
    return mergeAllDocuments(documentNodes);
};

const validateSchemasAsBool = (schemas: AggObjsByName<SchemaConfig>) => {
    try {
        validateSchemas(schemas);
        return true;
    } catch (error) {
        logger.error({error}, "Schema validation failed");
        return false;
    }
}

const syncSchema$ = gqlObjects$.pipe(
    map(x => x.schemas),
    filter(a => a && Object.keys(a).length > 0),
    filter(schemaBySource => validateSchemasAsBool(schemaBySource)),
    map(schemaBySource => makeGqlDocumentFromGqlSources(schemaBySource)),
    map(print),
    distinctUntilChanged(),
    shareReplay(1)
);

export default syncSchema$;
