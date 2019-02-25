import gql from "graphql-tag";
import { mergeDocuments } from "./schema-utils";
import { DocumentNode } from "graphql";

type GqlSource = {
  source: string;
  gql: string;
};

export type GqlSources = { [source: string]: string };

function parseGqlSource(gqlSource: GqlSource) {
  try {
    return gql(gqlSource.gql);
  } catch (e) {
    throw {
      message: `Failed to load schema for source -  ${gqlSource.source} - ${
        e.message
      }`,
      schema: gqlSource,
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

export const makeGqlDocumentFromGqlSources = (gqlSources: GqlSources) => {
  const documentNodes = Object.entries(gqlSources).map(([source, gql]) =>
    parseGqlSource({ source, gql })
  );
  return mergeAllDocuments(documentNodes);
};
