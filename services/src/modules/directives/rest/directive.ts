import { GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';

const directiveName = 'rest';

export const sdl = gql`
  input KeyValue {
    key: String!
    value: String!
    required: Boolean
  }

  directive @rest(
    url: String!
    method: String
    body: String
    bodyArg: String
    query: [KeyValue!]
    headers: [KeyValue!]
    timeoutMs: Int
    notFoundAsNull: Boolean
  ) on FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      // Check whether this field has the specified directive
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        fieldConfig.resolve = (source, args, context, info) =>
          context.dataSources.rest.doRequest(directive, { source, args, context, info });
        return fieldConfig;
      }
      return;
    },
  });
