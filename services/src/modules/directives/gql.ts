import {SchemaDirectiveVisitor, makeRemoteExecutableSchema, delegateToSchema, introspectSchema} from 'graphql-tools';
import {GraphQLField} from 'graphql';
import {gql} from 'apollo-server-core';
import {ApolloLink} from 'apollo-link';
import {HttpLink} from 'apollo-link-http';
import {setContext} from 'apollo-link-context';
import fetch from 'node-fetch';
import {injectParametersToObject} from '../param-injection';
import {getAuthHeaders} from '../auth/getAuthHeaders';
import {AuthenticationConfig} from '../auth/types';

export class GqlDirective extends SchemaDirectiveVisitor {
    async createRemoteSchema(url: string, config: AuthenticationConfig) {
        const httpLink: ApolloLink = new HttpLink({uri: url, fetch: fetch as any});
        const link = setContext(async (_, context) => ({
            headers: await getAuthHeaders(config, new URL(url).host, context?.graphqlContext?.request as any),
        })).concat(httpLink);

        return await introspectSchema(link).then(schema => makeRemoteExecutableSchema({schema, link}));
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const {url, fieldName, arguments: gqlArgs, operationType: operationTypeParam} = this.args;
        const operationType = operationTypeParam?.toLowerCase() ?? 'query';
        const remoteSchema = this.createRemoteSchema(url, this.context.authenticationConfig);

        field.resolve = async (parent, args, context, info) => {
            return await delegateToSchema({
                schema: await remoteSchema,
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
