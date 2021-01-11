import { ApolloError } from 'apollo-server-core';
import { GraphQLError } from 'graphql';
import * as _ from 'lodash';
import { ResourceMetadata, Upstream } from '../../resource-repository';

export default function validateUpstreams(upstreams: Upstream[]) {
  const errors: GraphQLError[] = [];

  const existingHosts = new Map<string, Upstream>();
  for (const upstream of upstreams) {
    validateUpstreamTemplate(errors, upstream, upstreams, new Set<ResourceMetadata>());

    if (!upstream?.isTemplate && !upstream.host && !upstream.sourceHosts) {
      errors.push(
        new ApolloError(
          'Upstream should have either sourceHosts or host property or to be a template',
          'INVALID_UPSTREAM_CONFIGURATION',
          {
            metadata: upstream.metadata,
          }
        )
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

function validateUpstreamTemplate(
  errors: GraphQLError[],
  upstream: Upstream,
  upstreams: Upstream[],
  descendants: Set<ResourceMetadata>
) {
  if (!upstream) return;
  if (!upstream.fromTemplate) return;
  if (descendants.has(upstream.metadata)) {
    errors.push(
      new ApolloError('Upstream circular reference', 'UPSTREAM_CIRCULAR_REFERENCE', {
        metadata: upstream.metadata,
      })
    );
    return;
  }

  descendants.add(upstream.metadata);

  const upstreamTemplate = upstreams.find(u => _.isEqual(u.metadata, upstream.fromTemplate));
  if (!upstreamTemplate) {
    errors.push(
      new ApolloError('Upstream has non-existent upstream template', 'INVALID_UPSTREAM_CONFIGURATION', {
        metadata: upstream.metadata,
        template: upstream.fromTemplate,
      })
    );
    return;
  }
  validateUpstreamTemplate(errors, upstreamTemplate, upstreams, descendants);
}
