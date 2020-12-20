import fetch from 'node-fetch';
import { createHttpLink } from 'apollo-link-http';
import { ObjectTypeDefinitionNode, parse, printSchema, StringValueNode } from 'graphql';
import { introspectSchema } from 'graphql-tools';
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

export async function updateRemoteGqlSchemas(resourceGroup: ResourceGroup, activeDirectoryAuth: ActiveDirectoryAuth) {
  const knownRemoteGqlServers = new Set(resourceGroup.remoteSchemas?.map(rs => rs.url));
  const urls = new Set<string>();
  for (const { schema } of resourceGroup.schemas) {
    const typeDefs = parse(schema);
    const objectTypeDefinitions = typeDefs.definitions.filter(
      d => d.kind === 'ObjectTypeDefinition'
    ) as ObjectTypeDefinitionNode[];

    for (const { fields } of objectTypeDefinitions) {
      if (!fields) continue;

      for (const field of fields) {
        const gqlDirectives = field.directives?.filter(d => d.name.value === 'gql');
        if (!gqlDirectives) continue;

        for (const gqlDirective of gqlDirectives) {
          if (!gqlDirective.arguments) continue;

          const urlArgument = gqlDirective.arguments!.find(a => a.name.value === 'url');
          if (!urlArgument) continue;
          const url = (urlArgument!.value as StringValueNode).value;

          if (!knownRemoteGqlServers.has(url)) {
            urls.add(url);
          }
        }
      }
    }

    const gqlIntrospectUrls = Array.from(urls);
    const newSchemas = await Promise.all(
      gqlIntrospectUrls.map(async url => ({
        url,
        schema: await fetchRemoteGqlSchema(url, resourceGroup, activeDirectoryAuth),
      }))
    );
    if (!newSchemas || newSchemas.length === 0) return;

    if (!resourceGroup.remoteSchemas) {
      resourceGroup.remoteSchemas = [];
    }
    resourceGroup.remoteSchemas.push(...newSchemas);
  }
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
