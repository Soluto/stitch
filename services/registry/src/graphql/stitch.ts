import {DocumentNode, parse} from 'graphql';
import {mergeDocuments} from './schema-utils';
import {AggObjsByName} from '../sync/sync-service';
import {SchemaConfig} from '../sync/object-types';

function parseGqlSource(schemaName: string, schema: string) {
    try {
        return parse(schema);
    } catch (e) {
        throw {
            error: e,
            message: `Failed to load schema for source -  ${schemaName} - ${e.message}`,
            schema: {schemaName, schema},
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

export const stitchSchemas = (gqlSchemas: AggObjsByName) => {
    const documentNodes = Object.entries(gqlSchemas).map(([schemaName, schema]: [string, SchemaConfig]) =>
        parseGqlSource(schemaName, schema.definition)
    );
    return mergeAllDocuments(documentNodes);
};
