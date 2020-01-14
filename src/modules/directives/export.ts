import {SchemaDirectiveVisitor} from 'graphql-tools';
import {gql} from 'apollo-server-core';
import {GraphQLField, defaultFieldResolver} from 'graphql';
import {writeToContext} from '../param-injection/context';

export class ExportDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const originalResolve = field.resolve || defaultFieldResolver;

        field.resolve = async (parent, args, context, info) => {
            const result = await originalResolve(parent, args, context, info);

            writeToContext(context, this.args.key, result);

            return result;
        };
    }
}

export const sdl = gql`
    directive @export(key: String!) on FIELD_DEFINITION
`;
