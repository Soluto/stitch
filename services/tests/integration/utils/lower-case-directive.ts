import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, defaultFieldResolver, GraphQLObjectType } from 'graphql';
import { gql } from 'apollo-server-core';

export class LowerCaseDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType<unknown, unknown>) {
    const fields = object.getFields();
    const fieldDefinitions = object.astNode?.fields;

    if (fieldDefinitions) {
      for (const fd of fieldDefinitions) {
        const field = fields[fd.name.value];
        this.visitFieldDefinition(field);
      }
    }
  }

  visitFieldDefinition(field: GraphQLField<unknown, unknown>) {
    const originalResolve = field.resolve || defaultFieldResolver;
    field.resolve = async (parent, args, context, info) => {
      const result = await originalResolve.call(field, parent, args, context, info);

      return String(result).toLowerCase();
    };
  }
}

export const sdl = gql`
  directive @lowerCase on OBJECT | FIELD_DEFINITION
`;
