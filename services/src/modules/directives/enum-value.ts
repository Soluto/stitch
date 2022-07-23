import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { gql } from 'apollo-server-core';
import { GraphQLSchema } from 'graphql';

const directiveName = 'enumValue';

export const sdl = gql`
  directive @enumValue(value: JSON!) on ENUM_VALUE
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.ENUM_VALUE]: valueConfig => {
      const directive = getDirective(schema, valueConfig, directiveName)?.[0];
      if (directive) {
        return valueConfig;
      }
      return;
    },
  });
