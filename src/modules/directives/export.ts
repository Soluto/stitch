import {SchemaDirectiveVisitor} from 'graphql-tools';
import {gql} from 'apollo-server-core';
import {GraphQLField, GraphQLInterfaceType, GraphQLObjectType} from 'graphql';
import {markExport} from '../exportsExtension';

export class ExportDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(
        field: GraphQLField<any, any>,
        details: {objectType: GraphQLObjectType | GraphQLInterfaceType}
    ) {
        markExport(details.objectType, field, this.args.key);
    }
}

export const sdl = gql`
    directive @export(key: String!) on FIELD_DEFINITION
`;
