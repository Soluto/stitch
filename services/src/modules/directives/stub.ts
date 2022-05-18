import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';
import { inject } from '../arguments-injection';

const directiveName = 'stub';

export const sdl = gql`
  directive @stub(value: JSON!) on FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        const { value } = directive;
        fieldConfig.resolve = (source, args, context, info) =>
          typeof value === 'string' ? inject(value, { source, args, context, info }) : value;
        return fieldConfig;
      }
      return;
    },
  });
