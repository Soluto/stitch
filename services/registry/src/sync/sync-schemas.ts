// tslint:disable-next-line:no-submodule-imports
import { print } from 'graphql/language/printer';
// tslint:disable-next-line:no-submodule-imports
import { distinctUntilChanged, filter, map, shareReplay } from 'rxjs/operators';

import gqlObjects$, { AggObjsByName } from './sync-service';

import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { mergeDocuments } from '../graphql/schema-utils';
import { SchemaConfig } from './object-types';

function parseGqlSource(schemaName: string, schema: string) {
  try {
    return gql(schema);
  } catch (e) {
    throw {
      error: e,
      message: `Failed to load schema for source -  ${schemaName} - ${
                e.message
                }`,
      schema: { schemaName, schema }
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
      schemas: docs
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

const syncSchema$ = gqlObjects$.pipe(
  map(x => x.schemas),
  filter(a => a && Object.keys(a).length > 0),
  map(schemaBySource => makeGqlDocumentFromGqlSources(schemaBySource)),
  map(print),
  distinctUntilChanged(),
  shareReplay(1)
);

export default syncSchema$;
