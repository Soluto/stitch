import {ApolloServer, gql, IResolvers, ApolloError} from 'apollo-server-fastify';
import * as fastify from 'fastify';
import {parse, DocumentNode, visit, print, GraphQLError} from 'graphql';
import {composeAndValidate} from '@apollo/federation';
import {fetch, ResourceGroup} from './modules/resource-repository';
import * as baseSchema from './modules/baseSchema';
import federationDirectives from '@apollo/federation/dist/directives';

const typeDefs = gql`
    input UpsertSchemaInput {
        namespace: String!
        name: String!
        schema: String!
    }

    type UpsertSchemaResult {
        success: Boolean!
    }

    type Query {
        testSchema(input: UpsertSchemaInput!): UpsertSchemaResult
    }

    type Mutation {
        upsertSchema(input: UpsertSchemaInput!): UpsertSchemaResult
    }
`;

interface UpsertSchemaInput {
    namespace: string;
    name: string;
    schema: string;
}

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

function validateResourceGroup(rg: ResourceGroup) {
    const serviceDefs = Object.entries(rg.schemas).map(([name, typeDef]) => {
        const typeDefWithoutDirectives = removeNonFederationDirectives(parse(typeDef));

        const finalTypeDef = gql`
            ${baseSchema.baseTypeDef}
            ${print(typeDefWithoutDirectives)}
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

const resolvers: IResolvers = {
    Query: {
        async testSchema(_, {input}: {input: UpsertSchemaInput}) {
            const rg = await fetch();
            const schemas = {...rg.schemas, [`${input.namespace}.${input.name}`]: input.schema};

            validateResourceGroup({schemas});

            return {success: true};
        },
    },
    Mutation: {
        async upsertSchema(_, {input}: {input: UpsertSchemaInput}) {
            const rg = await fetch();
            const schemas = {...rg.schemas, [`${input.namespace}.${input.name}`]: input.schema};

            validateResourceGroup({schemas});

            // save schemas

            return {success: true};
        },
    },
};

async function run() {
    const apollo = new ApolloServer({
        typeDefs,
        resolvers,
    });

    const app = fastify();
    app.register(apollo.createHandler({path: '/graphql'}));
    const res = await app.listen(8080, '0.0.0.0');
    console.log('Server is up at', res);
}

run();
