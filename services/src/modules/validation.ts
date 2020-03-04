import {ApolloError} from 'apollo-server-fastify';
import {GraphQLError} from 'graphql';
import {ResourceGroup, Upstream} from './resource-repository';

function validateUpstreams(upstreams: Upstream[]) {
    const errors: GraphQLError[] = [];

    const existingHosts = new Map<string, Upstream>();
    for (const upstream of upstreams) {
        const existingUpstream = existingHosts.get(upstream.host);
        if (typeof existingUpstream === 'undefined') {
            existingHosts.set(upstream.host, upstream);
        } else {
            errors.push(
                new ApolloError('Duplicate host found on upstream', 'DUPLICATE_UPSTREAM_FOUND', {
                    host: upstream.host,
                    upstreams: [upstream.metadata, existingUpstream.metadata],
                })
            );
        }
    }

    const existingResourceAuthorityPairs = new Map<string, Upstream>();
    for (const upstream of upstreams) {
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

export function validateResourceGroupOrThrow(rg: ResourceGroup) {
    const errors: GraphQLError[] = [];

    if (rg.upstreams.length > 0) {
        errors.push(...validateUpstreams(rg.upstreams));
    }

    if (errors.length > 0) {
        throw new ApolloError('Resource validation failed', 'RESOURCE_VALIDATION_FAILURE', {
            errors: errors.map(err => (err instanceof GraphQLError ? err : new GraphQLError(err!.message))),
        });
    }
}
