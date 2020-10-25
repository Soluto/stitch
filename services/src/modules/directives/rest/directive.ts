import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField } from 'graphql';
import { gql } from 'apollo-server-core';
import { RequestContext } from '../../context';
import { RestParams } from './types';

export class RestDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    field.resolve = (parent, args, context, info) =>
      context.dataSources.rest.doRequest(this.args as RestParams, parent, args, context, info);
  }
}

export const sdl = gql`
  input KeyValue {
    key: String!
    value: String!
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
