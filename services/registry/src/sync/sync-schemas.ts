import { map, shareReplay, distinctUntilChanged, filter } from "rxjs/operators";
import { print } from "graphql/language/printer";

import gqlObjects$, { GqlObjsByName } from "./sync-service";

import gql from "graphql-tag";
import { mergeDocuments } from "../graphql/schema-utils";
import { DocumentNode } from "graphql";
import { SchemaConfig } from "./object-types";

function parseGqlSource(schemaName: string, schema: string) {
    try {
        return gql(schema);
    } catch (e) {
        throw {
            message: `Failed to load schema for source -  ${schemaName} - ${
                e.message
                }`,
            schema: { schemaName, schema },
            error: e
        };
    }
}

function mergeAllDocuments(docs: DocumentNode[]) {
    try {
        return mergeDocuments(docs);
    } catch (e) {
        throw {
            message: `Failed to merge schemas - ${e.message}`,
            schemas: docs,
            error: e
        };
    }
}

export const makeGqlDocumentFromGqlSources = (gqlSchemas: GqlObjsByName) => {
    const documentNodes = Object.entries(gqlSchemas).map(
        ([schemaName, schema]: [string, SchemaConfig]) =>
            parseGqlSource(schemaName, schema.definition)
    );
    return mergeAllDocuments(documentNodes);
};

const syncSchema$ = gqlObjects$.pipe(
    map(x => x.schemas),
    filter(a => a && Object.keys(a).length > 0),
    map(schemaBySource => makeGqlDocumentFromGqlSources(schemaBySource)),
    map(print),
    distinctUntilChanged(),
    shareReplay(1)
);

export default syncSchema$;
