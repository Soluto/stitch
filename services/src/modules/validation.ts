import {gql, ApolloError} from 'apollo-server-fastify';
import {parse, DocumentNode, visit, print, GraphQLError} from 'graphql';
import {composeAndValidate} from '@apollo/federation';
import federationDirectives from '@apollo/federation/dist/directives';

import {ResourceGroup, Schema, Upstream} from './resource-repository';
import * as baseSchema from './baseSchema';

const removeNonFederationDirectives = (typeDef: DocumentNode) => {
    // If we don't print and re-parse, some old bits of the directives still remain in the data structure <_<
    return parse(
        print(
            visit(typeDef, {
                Directive(node) {
                    return federationDirectives.some(directive => directive.name === node.name.value)
                        ? undefined
                        : null;
                },
            })
        )
    );
};

function validateSchemas(schemas: Schema[]) {
    const serviceDefs = Object.entries(schemas).map(([name, typeDef]) => {
        const typeDefWithoutDirectives = removeNonFederationDirectives(parse(typeDef.schema));

        const finalTypeDef = gql`
            ${baseSchema.baseTypeDef}
            ${typeDefWithoutDirectives}
        `;

        return {
            name,
            typeDefs: finalTypeDef,
        };
    });

    const composeResults = composeAndValidate(serviceDefs);
    return composeResults.errors;
}

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

    if (rg.schemas.length > 0) {
        errors.push(...validateSchemas(rg.schemas));
    }

    if (rg.upstreams.length > 0) {
        errors.push(...validateUpstreams(rg.upstreams));
    }

    if (errors.length > 0) {
        throw new ApolloError('Resource validation failed', 'RESOURCE_VALIDATION_FAILURE', {
            errors: errors.map(err => (err instanceof GraphQLError ? err : new GraphQLError(err!.message))),
        });
    }
}
