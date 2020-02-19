import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField} from 'graphql';
import {gql} from 'apollo-server-core';
import {injectParameters} from '../param-injection';

export class StubDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const {value} = this.args;

        field.resolve = (parent, args, context, info) =>
            typeof value === 'string' ? injectParameters(value, parent, args, context, info) : value;
    }
}

export const sdl = gql`
    directive @stub(value: JSON!) on FIELD_DEFINITION
`;
