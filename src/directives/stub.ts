import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField, GraphQLInterfaceType, GraphQLObjectType} from 'graphql';
import {gql} from 'apollo-server-core';

export class StubDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(
        field: GraphQLField<any, any>,
        {objectType}: {objectType: GraphQLObjectType | GraphQLInterfaceType}
    ) {
        const {value} = this.args;

        if (typeof value !== 'string') {
            throw new Error(
                `Expected @stub directive on field ${objectType.name}.${
                    field.name
                } to have String! argument, instead found ${typeof value}`
            );
        }

        field.resolve = () => value;
    }
}

export const sdl = gql`
    directive @stub(value: String!) on FIELD_DEFINITION
`;
