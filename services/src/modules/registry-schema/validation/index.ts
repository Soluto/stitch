import { ApolloError } from 'apollo-server-fastify';
import { GraphQLError } from 'graphql';
import * as _ from 'lodash';
import logger from '../../logger';
import { ResourceGroup, Upstream, Resource } from '../../resource-repository';

// Valid graphql name with the addition of dashes (http://spec.graphql.org/June2018/#sec-Names)
const validNameRegex = /^[A-Z_a-z-][\w-]*$/;

const resourceTypesWithMetadata = new Set(['schemas', 'upstreams', 'upstreamClientCredentials', 'policies']);
type ResourceTypeWithMetadata = 'schemas' | 'upstreams' | 'upstreamClientCredentials' | 'policies';

function validateUpstreams(upstreams: Upstream[]) {
  const errors: GraphQLError[] = [];

  const existingHosts = new Map<string, Upstream>();
  for (const upstream of upstreams) {
    if (!upstream.host && !upstream.sourceHosts) {
      errors.push(
        new ApolloError('Upstream should have either sourceHosts or host property', 'INVALID_UPSTREAM_CONFIGURATION', {
          metadata: upstream.metadata,
        })
      );
      continue;
    }

    if (upstream.host && upstream.sourceHosts) {
      errors.push(
        new ApolloError('Upstream should have either sourceHosts or host property', 'INVALID_UPSTREAM_CONFIGURATION', {
          host: upstream.host,
          sourceHosts: upstream.sourceHosts,
          metadata: upstream.metadata,
        })
      );
      continue;
    }

    const validateHost = (host: string) => {
      const existingUpstream = existingHosts.get(host);

      if (typeof existingUpstream === 'undefined') existingHosts.set(host, upstream);
      else {
        errors.push(
          new ApolloError('Duplicate host found on upstream', 'DUPLICATE_UPSTREAM_FOUND', {
            host,
            upstreams: [upstream.metadata, existingUpstream.metadata],
          })
        );
      }
    };

    if (upstream.host) validateHost(upstream.host);
    if (upstream.sourceHosts) upstream.sourceHosts.forEach(validateHost);
  }

  const existingResourceAuthorityPairs = new Map<string, Upstream>();
  for (const upstream of upstreams) {
    if (!upstream.auth) continue;

    const upstreamKey = JSON.stringify(upstream.auth.activeDirectory);
    const existingUpstream = existingResourceAuthorityPairs.get(upstreamKey);
    if (typeof existingUpstream === 'undefined') {
      existingResourceAuthorityPairs.set(upstreamKey, upstream);
    } else {
      errors.push(
        new ApolloError('Duplicate authority+resource found on upstream', 'DUPLICATE_UPSTREAM_FOUND', {
          authority: upstream.auth.activeDirectory,
          upstreams: [upstream.metadata, existingUpstream.metadata],
        })
      );
    }
  }

  return errors;
}

function validateMetadataCharacters(rg: ResourceGroup) {
  const errors: GraphQLError[] = [];

  for (const [resourceType, resources] of Object.entries(rg) as [string, Resource[]][]) {
    if (!resourceTypesWithMetadata.has(resourceType)) continue;

    for (const resource of resources) {
      const { name, namespace } = resource.metadata;

      if (!validNameRegex.test(namespace)) {
        errors.push(
          new ApolloError(
            `Invalid characters found in namespace name ${namespace} of resource type ${resourceType}, allowed characters are /${validNameRegex.source}/`,
            'INVALID_CHARACTERS_IN_NAME',
            { resource: { type: resourceType, namespace, name } }
          )
        );
      }

      if (!validNameRegex.test(name)) {
        errors.push(
          new ApolloError(
            `Invalid characters found in resource name ${name} of resource type ${resourceType}, allowed characters are /${validNameRegex.source}/`,
            'INVALID_CHARACTERS_IN_NAME',
            { resource: { type: resourceType, namespace, name } }
          )
        );
      }
    }
  }

  return errors;
}

// Verifies namespaces and names to not have two similar ones differing only between
// underscores and dashes (e.g. 'some-ns' and 'some_ns' would return a conflict error)
function validateMetadataNameConflicts(rg: ResourceGroup) {
  const errors: GraphQLError[] = [];
  const existingNamespaces = new Map<string, string>();
  const existingNamesByNamespaceAndResource = {
    schemas: new Map<string, Map<string, string>>(),
    upstreams: new Map<string, Map<string, string>>(),
    upstreamClientCredentials: new Map<string, Map<string, string>>(),
    policies: new Map<string, Map<string, string>>(),
  };

  for (const [resourceType, resources] of Object.entries(rg) as [string, Resource[]][]) {
    if (!resourceTypesWithMetadata.has(resourceType)) continue;

    for (const resource of resources) {
      const { name, namespace } = resource.metadata;

      const namespaceWithUnderscores = namespace.replace(/-/g, '_');
      const existingNamespace = existingNamespaces.get(namespaceWithUnderscores);
      if (!existingNamespace) {
        existingNamespaces.set(namespaceWithUnderscores, namespace);
      } else {
        if (existingNamespace !== namespace) {
          errors.push(
            new ApolloError(
              `Namespace name conflict found between ${existingNamespace} and ${namespace}, they have to either match exactly or have a difference in non-special characters`,
              'NAME_CONFLICT',
              { resource: { type: resourceType, namespace, name } }
            )
          );
        }
      }

      const nameWithUnderscores = name.replace(/-/g, '_');
      const existingNamesByNamespace = existingNamesByNamespaceAndResource[resourceType as ResourceTypeWithMetadata];
      let existingNames = existingNamesByNamespace.get(namespace);
      if (!existingNames) {
        existingNames = new Map<string, string>();
        existingNamesByNamespace.set(namespace, existingNames);
      }

      const existingName = existingNames.get(nameWithUnderscores);
      if (!existingName) {
        existingNames.set(nameWithUnderscores, name);
      } else {
        if (existingName !== name) {
          errors.push(
            new ApolloError(
              `Resource name conflict found between ${existingName} and ${name} of resource type ${resourceType} in namespace ${namespace}, they have to either match exactly or have a difference in non-special characters`,
              'NAME_CONFLICT',
              { resource: { type: resourceType, namespace, name } }
            )
          );
        }
      }
    }
  }

  return errors;
}

export function validateResourceGroupOrThrow(rg: ResourceGroup) {
  const errors: GraphQLError[] = [];

  if (rg.upstreams.length > 0) {
    errors.push(...validateUpstreams(rg.upstreams));
  }

  errors.push(...validateMetadataCharacters(rg));
  errors.push(...validateMetadataNameConflicts(rg));

  if (errors.length > 0) {
    logger.warn({ errors }, 'Resource validation failed');
    throw new ApolloError('Resource validation failed', 'RESOURCE_VALIDATION_FAILURE', {
      errors: errors.map(e => _.pick(e, 'name', 'message', 'extensions')),
    });
  }
}
