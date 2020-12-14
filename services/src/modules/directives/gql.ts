import { SchemaDirectiveVisitor, makeRemoteExecutableSchema, delegateToSchema, introspectSchema } from 'graphql-tools';
import { GraphQLField, GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { RetryLink } from 'apollo-link-retry';
import { setContext } from 'apollo-link-context';
import fetch from 'node-fetch';
import { FastifyRequest } from 'fastify';
import { inject } from '../arguments-injection';
import { ActiveDirectoryAuth, getAuthHeaders } from '../upstreams/authentication';
import logger from '../logger';
import { RequestContext } from '../context';
import { ResourceGroup } from '../resource-repository';

const pendingIntrospectionRetries = new Map<string, NodeJS.Timeout>();

export class GqlDirective extends SchemaDirectiveVisitor {
  createRemoteSchema(
    url: string,
    resourceGroup: ResourceGroup,
    activeDirectoryAuth: ActiveDirectoryAuth,
    timeoutMs?: number
  ) {
    const httpLink: ApolloLink = new HttpLink({
      uri: url,
      fetch: fetch as any,
      fetchOptions: { timeout: timeoutMs ?? 10000 },
    });
    const authLink = setContext(async (_, context) => ({
      headers: await getAuthHeaders(
        resourceGroup,
        activeDirectoryAuth,
        new URL(url).host,
        context?.graphqlContext?.request as FastifyRequest
      ),
    })).concat(httpLink);
    const retryLink = new RetryLink({
      delay: { max: 5000 },
      attempts: {
        max: 5,
        retryIf(error) {
          logger.warn({ error, url }, 'Failed fetching introspection query');
          return !!error;
        },
      },
    }).concat(authLink);

    pendingIntrospectionRetries.delete(url);

    const result: RemoteSchemaWithStatus = { ready: false };
    this.runIntrospection(retryLink, authLink, result, url);
    return result;
  }

  runIntrospection(retryLink: ApolloLink, authLink: ApolloLink, result: RemoteSchemaWithStatus, url: string) {
    // Only introspection should retry, because if we don't have the introspection result this entire resolver will fail.
    // Normal gql requests should not retry, at least for now, because that is more complicated than introspection.
    introspectSchema(retryLink)
      .then(schema => makeRemoteExecutableSchema({ schema, link: authLink }))
      .then(schema => Object.assign(result, { schema, ready: true }))
      .catch(err => {
        logger.error({ err, url }, 'Failed all retries of fetching introspection query, will retry in 10 minutes');
        // https://github.com/Microsoft/TypeScript/issues/30128
        const timeout = global.setTimeout(() => {
          this.runIntrospection(retryLink, authLink, result, url);
        }, 10 * 60 * 1000);
        pendingIntrospectionRetries.set(url, timeout);
      });
  }

  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const { url, fieldName, arguments: gqlArgs, operationType: operationTypeParam, timeoutMs } = this.args;
    const operationType = operationTypeParam?.toLowerCase() ?? 'query';
    const remoteSchema = this.createRemoteSchema(
      url,
      this.context.resourceGroup,
      this.context.activeDirectoryAuth,
      timeoutMs
    );

    field.resolve = async (source, args, context, info) => {
      if (!remoteSchema.ready) throw new Error(`Failed reaching remote gql server for introspection (url ${url})`);

      return await delegateToSchema({
        schema: remoteSchema.schema!,
        operation: operationType,
        fieldName,
        args: inject(gqlArgs, { source, args, context, info }) as Record<string, unknown>,
        context,
        info,
      });
    };
  }
}

type RemoteSchemaWithStatus = {
  ready: boolean;
  schema?: GraphQLSchema;
};

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
