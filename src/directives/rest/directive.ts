import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField} from 'graphql';
import {gql} from 'apollo-server-core';
import {RequestContext} from '../../context';
import {RestParams} from './types';

export class RestDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        field.resolve = (parent, args, {dataSources: {rest}}: RequestContext) =>
            rest.doRequest(this.args as RestParams, parent, args);
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
