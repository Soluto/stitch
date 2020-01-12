import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField} from 'graphql';
import {gql} from 'apollo-server-core';

export class StubDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const {value} = this.args;

        field.resolve = () => value;
    }
}

export const sdl = gql`
    directive @stub(value: String!) on FIELD_DEFINITION
`;
