import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';

const directiveName = 'mock';

export const sdl = gql`
  directive @mock on OBJECT | FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: object => {
      const directive = getDirective(schema, object, directiveName)?.[0];
      if (directive) {
        object.resolveObject = source => {
          const { id } = source;
          return {
            bar: `BAR: ${id}`,
          };
        };
        return object;
      }
      return;
    },
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        fieldConfig.resolve = source => {
          const { id } = source;
          return {
            bar: `BAR: ${id}`,
          };
        };
        return fieldConfig;
      }
      return;
    },
  });
