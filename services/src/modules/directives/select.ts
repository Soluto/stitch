import {SchemaDirectiveVisitor} from 'graphql-tools';
import {GraphQLField, defaultFieldResolver} from 'graphql';
import {gql} from 'apollo-server-core';

export class SelectDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const {path} = this.args as {path: string[]};

        field.resolve = async (parent, args, context, info) => {
            const resolve = field.resolve || defaultFieldResolver;
            const result = await resolve.call(field, parent, args, context, info);

            return path.reduce((value, segment) => value && value[segment], result);
        };
    }
}

export const sdl = gql`
    directive @select(path: [String!]!) on FIELD_DEFINITION
`;
