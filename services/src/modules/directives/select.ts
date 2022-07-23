import { defaultFieldResolver, GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';
import { mapSchema, MapperKind, getDirective } from '@graphql-tools/utils';

const directiveName = 'select';

export const sdl = gql`
  directive @select(path: [String!]!) on FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        const { path } = directive as { path: string[] };

        const originalResolve = fieldConfig.resolve || defaultFieldResolver;
        fieldConfig.resolve = async (source, args, context, info) => {
          const result = await originalResolve.call(fieldConfig, source, args, context, info);

          return path.reduce((value, segment) => value && value[segment], result);
        };
        return fieldConfig;
      }
      return;
    },
  });
