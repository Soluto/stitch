import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, GraphQLObjectType } from 'graphql';
import { gql } from 'apollo-server-core';

export class MockDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType<{ id: string }, unknown>) {
    object.resolveObject = source => {
      const { id } = source;
      return {
        bar: `BAR: ${id}`,
      };
    };
  }

  visitFieldDefinition(field: GraphQLField<{ id: string }, unknown>) {
    field.resolve = source => {
      const { id } = source;
      return {
        bar: `BAR: ${id}`,
      };
    };
  }
}

export const sdl = gql`
  directive @mock on OBJECT | FIELD_DEFINITION
`;
