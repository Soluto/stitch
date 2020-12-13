import { GraphQLField } from 'graphql';
import { SchemaDirectiveVisitor, delegateToSchema, makeRemoteExecutableSchema } from 'graphql-tools';
import { ApolloError, gql } from 'apollo-server-core';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import { FastifyRequest } from 'fastify';
import fetch from 'node-fetch';
import { inject } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { getAuthHeaders } from '../../upstreams/authentication';
import { RemoteSchema } from './introspection';

export class GqlDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const { url, fieldName, arguments: gqlArgs, operationType: operationTypeParam, timeoutMs } = this.args;
    const operationType = operationTypeParam?.toLowerCase() ?? 'query';

    if (!this.context?.resourceGroup) return;

    const remoteSchemas: RemoteSchema[] = this.context.resourceGroup.remoteSchemas;
    const remoteSchemaResource = remoteSchemas.find(rs => rs.url === url)?.schema;
    if (!remoteSchemaResource) {
      throw new ApolloError(`Remote schema for ${url} not found in resource group`);
    }

    const httpLink: ApolloLink = new HttpLink({
      uri: url,
      fetch: fetch as any,
      fetchOptions: { timeout: timeoutMs ?? 10000 },
    });

    const authHttpLink = setContext(async (_, context) => ({
      headers: await getAuthHeaders(
        this.context.resourceGroup,
        this.context.activeDirectoryAuth,
        new URL(url).host,
        context?.graphqlContext?.request as FastifyRequest
      ),
    })).concat(httpLink);

    const remoteSchema = makeRemoteExecutableSchema({
      schema: remoteSchemaResource,
      link: authHttpLink,
    });

    field.resolve = async (source, args, context, info) => {
      return await delegateToSchema({
        schema: remoteSchema,
        operation: operationType,
        fieldName,
        args: inject(gqlArgs, { source, args, context, info }) as Record<string, unknown>,
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
    timeoutMs: Int
  ) on FIELD_DEFINITION
`;
