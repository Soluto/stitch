import fetch from 'node-fetch';
import { createHttpLink } from 'apollo-link-http';
import { GraphQLSchema, printSchema } from 'graphql';
import { introspectSchema, SchemaDirectiveVisitor } from 'graphql-tools';
import { ApolloError } from 'apollo-server-core';
import { setContext } from 'apollo-link-context';
import { RetryLink } from 'apollo-link-retry';
import { FastifyRequest } from 'fastify';
import { ActiveDirectoryAuth, getAuthHeaders } from '../../upstreams/authentication';
import logger from '../../logger';
import { ResourceGroup } from '../../resource-repository';

export interface RemoteSchema {
  url: string;
  schema: string;
}

export async function updateRemoteGqlSchemas(
  schema: GraphQLSchema,
  resourceGroup: ResourceGroup,
  activeDirectoryAuth: ActiveDirectoryAuth
) {
  const newSchemas = await fetchRemoteGqlSchemas(schema, resourceGroup, activeDirectoryAuth);
  resourceGroup.remoteSchemas.push(...newSchemas);
}

async function fetchRemoteGqlSchemas(
  schema: GraphQLSchema,
  resourceGroup: ResourceGroup,
  activeDirectoryAuth: ActiveDirectoryAuth
) {
  const results: Record<string, SchemaDirectiveVisitor[]> = SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
    gql: GqlRegistryVisitor,
  });
  const knownRemoteGqlServers = new Set(resourceGroup.remoteSchemas.map(rs => rs.url));
  const gqlIntrospectUrls = results['gql']
    .map(i => i.args.url)
    .filter((url, idx, self) => !!url && !knownRemoteGqlServers.has(url) && self.indexOf(url) === idx) as string[];
  const schemas = await Promise.all(
    gqlIntrospectUrls.map(async url => ({
      url,
      schema: await fetchRemoteGqlSchema(url, resourceGroup, activeDirectoryAuth),
    }))
  );
  return schemas;
}

async function fetchRemoteGqlSchema(
  url: string,
  resourceGroup: ResourceGroup,
  activeDirectoryAuth: ActiveDirectoryAuth
) {
  try {
    const httpLink = createHttpLink({ uri: url, fetch: fetch as any });
    const authHttpLink = setContext(async (_, context) => ({
      headers: await getAuthHeaders(
        resourceGroup,
        activeDirectoryAuth,
        new URL(url).host,
        context?.graphqlContext?.request as FastifyRequest
      ),
    })).concat(httpLink);
    const authHttpLinkWithRetry = new RetryLink({
      delay: { max: 1000 },
      attempts: {
        max: 3,
        retryIf(error) {
          logger.warn({ error, url }, 'Failed fetching introspection query');
          return !!error;
        },
      },
    }).concat(authHttpLink);
    const remoteSchema = await introspectSchema(authHttpLinkWithRetry);
    return printSchema(remoteSchema);
  } catch (err) {
    logger.error({ err, url }, `Introspection query to ${url} failed`);
    throw new ApolloError(`Introspection query to ${url} failed`);
  }
}

class GqlRegistryVisitor extends SchemaDirectiveVisitor {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  visitFieldDefinition() {}
}
