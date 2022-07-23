import fetch from 'node-fetch';
import { print, ObjectTypeDefinitionNode, ObjectTypeExtensionNode, parse, printSchema, StringValueNode } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import { ApolloError } from 'apollo-server-core';
import * as _ from 'lodash';
import { AsyncExecutor } from '@graphql-tools/utils';
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
    const executor: AsyncExecutor = async ({ document, variables }) => {
      const query = print(document);
      const fetchResult = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
      return fetchResult.json();
    };

    const requestParams = await applyUpstream(
      {
        url: new URL(url),
      },
      resourceGroup,
      context.activeDirectoryAuth,
      context.request
    );
    const executorContext = { ...requestParams, uri: requestParams.url };
    const remoteSchema = await introspectSchema(executor, executorContext);
    return printSchema(remoteSchema);
  } catch (err) {
    logger.error({ err, url }, `Introspection query to ${url} failed`);
    throw new ApolloError(`Introspection query to ${url} failed`);
  }
}
