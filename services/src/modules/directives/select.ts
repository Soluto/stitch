import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, defaultFieldResolver } from 'graphql';
import { gql } from 'apollo-server-core';
import { RequestContext } from '../context';

export class SelectDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const { path } = this.args as { path: string[] };

    const originalResolve = field.resolve || defaultFieldResolver;
    field.resolve = async (parent, args, context, info) => {
      const result = await originalResolve.call(field, parent, args, context, info);

      return path.reduce((value, segment) => value && value[segment], result);
    };
  }
}

export const sdl = gql`
  directive @select(path: [String!]!) on FIELD_DEFINITION
`;
