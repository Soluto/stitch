import {gql, ApolloError} from 'apollo-server-fastify';
import {parse, DocumentNode, visit, print, GraphQLError} from 'graphql';
import {composeAndValidate} from '@apollo/federation';
import federationDirectives from '@apollo/federation/dist/directives';

import {ResourceGroup} from './resource-repository';
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

export function validateResourceGroup(rg: ResourceGroup) {
    const serviceDefs = Object.entries(rg.schemas).map(([name, typeDef]) => {
        const typeDefWithoutDirectives = removeNonFederationDirectives(parse(typeDef));

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

    if (composeResults.errors.length > 0) {
        throw new ApolloError('Federation validation failed', 'FEDERATION_VALIDATION_FAILURE', {
            errors: composeResults.errors.map(err =>
                err instanceof GraphQLError ? err : new GraphQLError(err!.message)
            ),
        });
    }
}
