import {SchemaDirectiveVisitor, makeRemoteExecutableSchema, delegateToSchema, introspectSchema} from 'graphql-tools';
import {GraphQLField, GraphQLSchema} from 'graphql';
import {gql} from 'apollo-server-core';
import {HttpLink} from 'apollo-link-http';
import {setContext} from 'apollo-link-context';
import fetch from 'node-fetch';
import {injectParametersToObject} from '../param-injection';
import {getAuthHeaders} from '../auth';

export class GqlDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const {url, fieldName, arguments: gqlArgs, operationType: operationTypeParam} = this.args;
        const operationType = operationTypeParam?.toLowerCase() ?? 'query';

        const http = new HttpLink({uri: url, fetch: fetch as any});
        let schemaInitialized = false;
        let remoteSchema = {} as GraphQLSchema;

        field.resolve = async (parent, args, context, info) => {
            if (!schemaInitialized) {
                const link = setContext(async () => ({
                    headers: await getAuthHeaders(context, new URL(url)),
                })).concat(http);

                remoteSchema = await introspectSchema(link)
                    .then(schema => makeRemoteExecutableSchema({schema, link}))
                    .catch(ex => {
                        console.error(ex);
                        throw ex;
                    });
                schemaInitialized = true;
            }

            return await delegateToSchema({
                schema: remoteSchema,
                operation: operationType,
                fieldName,
                args: injectParametersToObject(gqlArgs, parent, args, context, info),
                context,
                info,
            });
        };
    }
}

export const sdl = gql`
    enum GraphQLOperationType {
        Query
        Mutation
    }

    directive @gql(
        url: String!
        fieldName: String!
        operationType: GraphQLOperationType
        arguments: JSONObject
    ) on FIELD_DEFINITION
`;
