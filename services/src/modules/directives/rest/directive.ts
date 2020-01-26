import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField} from 'graphql';
import {gql} from 'apollo-server-core';
import {RequestContext} from '../../context';
import {RestParams} from './types';

export class RestDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, RequestContext>) {
        field.resolve = (parent, args, {dataSources: {rest}}, info) =>
            rest.doRequest(this.args as RestParams, parent, args, info);
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
        bodyArg: String
        query: [KeyValue!]
        headers: [KeyValue!]
        timeoutMs: Int
    ) on FIELD_DEFINITION
`;
