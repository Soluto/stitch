import { defaultFieldResolver, GraphQLFieldResolver, GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';

const directiveName = 'lowerCase';

const mapObjectField = (fieldConfig: {
  resolve?: GraphQLFieldResolver<
    any,
    any,
    {
      [argName: string]: any;
    }
  >;
}) => {
  const originalResolve = fieldConfig.resolve || defaultFieldResolver;
  fieldConfig.resolve = async (source, args, context, info) => {
    const result = await originalResolve.call(fieldConfig, source, args, context, info);

    return String(result).toLowerCase();
  };
  return fieldConfig;
};

export const sdl = gql`
  directive @lowerCase on OBJECT | FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: object => {
      const directive = getDirective(schema, object, directiveName)?.[0];
      if (directive) {
        const fields = object.getFields();
        const fieldDefinitions = object.astNode?.fields;

        if (fieldDefinitions) {
          for (const fd of fieldDefinitions) {
            const field = fields[fd.name.value];
            mapObjectField(field);
          }
        }
        return object;
      }
      return;
    },
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        mapObjectField(fieldConfig);
        return fieldConfig;
      }
      return;
    },
  });
