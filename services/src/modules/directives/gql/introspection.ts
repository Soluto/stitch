import fetch from 'node-fetch';
import { createHttpLink } from 'apollo-link-http';
import { ObjectTypeDefinitionNode, ObjectTypeExtensionNode, parse, printSchema, StringValueNode } from 'graphql';
import { introspectSchema } from 'graphql-tools';
import { ApolloError } from 'apollo-server-core';
import { ApolloLink } from 'apollo-link';
import { setContext } from 'apollo-link-context';
import { RetryLink } from 'apollo-link-retry';
import * as _ from 'lodash';
import { applyUpstream } from '../../upstreams';
import logger from '../../logger';
import { ResourceGroup } from '../../resource-repository';
import { RegistryRequestContext } from '../../registry-schema';

export interface RemoteSchema {
  url: string;
  schema: string;
}

export async function updateRemoteGqlSchemas(resourceGroup: ResourceGroup, context: RegistryRequestContext) {
  const knownRemoteGqlServers = new Set(resourceGroup.remoteSchemas?.map(rs => rs.url));
  const unusedRemoteSchemas = new Set(knownRemoteGqlServers);
  const urls = new Set<string>();
  for (const { schema } of resourceGroup.schemas) {
    const typeDefs = parse(schema);
    const objectTypeDefinitions = typeDefs.definitions.filter(
      d => d.kind === 'ObjectTypeDefinition' || d.kind === 'ObjectTypeExtension'
    ) as (ObjectTypeDefinitionNode | ObjectTypeExtensionNode)[];

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

          unusedRemoteSchemas.delete(url);
        }
      }
    }
  }

  const gqlIntrospectUrls = Array.from(urls);
  const newSchemas = await Promise.all(
    gqlIntrospectUrls.map(async url => ({
      url,
      schema: await fetchRemoteGqlSchema(url, resourceGroup, context),
    }))
  );
  if (!newSchemas || newSchemas.length === 0) return;

  if (!resourceGroup.remoteSchemas) {
    resourceGroup.remoteSchemas = [];
  }
  resourceGroup.remoteSchemas.push(...newSchemas);

  _.remove(resourceGroup.remoteSchemas, rs => unusedRemoteSchemas.has(rs.url));
}

export async function fetchRemoteGqlSchema(url: string, resourceGroup: ResourceGroup, context: RegistryRequestContext) {
  try {
    const link = ApolloLink.from([
      new RetryLink({
        delay: { max: 1000 },
        attempts: {
          max: 3,
          retryIf(error) {
            logger.warn({ error, url }, 'Failed fetching introspection query');
            return !!error;
          },
        },
      }),
      setContext(async () => {
        const requestParams = await applyUpstream(
          {
            url: new URL(url),
          },
          resourceGroup,
          context.activeDirectoryAuth,
          context.request
        );
        return { ...requestParams, uri: requestParams.url };
      }),
      createHttpLink({ fetch: fetch as any }),
    ]);

    const remoteSchema = await introspectSchema(link);
    return printSchema(remoteSchema);
  } catch (err) {
    logger.error({ err, url }, `Introspection query to ${url} failed`);
    throw new ApolloError(`Introspection query to ${url} failed`);
  }
}
