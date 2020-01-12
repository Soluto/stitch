import {SchemaDirectiveVisitor, gql} from 'apollo-server';
import {
    GraphQLArgument,
    GraphQLField,
    GraphQLObjectType,
    GraphQLInterfaceType,
    defaultFieldResolver,
    GraphQLSchema,
} from 'graphql';
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
