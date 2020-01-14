import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField} from 'graphql';
import {gql} from 'apollo-server-core';
import {injectParameters} from '../param-injection';

export class StubDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const {value} = this.args;

        field.resolve = (parent, args, context) => injectParameters(value, parent, args, context);
    }
}

export const sdl = gql`
    directive @stub(value: String!) on FIELD_DEFINITION
`;
