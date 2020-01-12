// Hack until https://github.com/apollographql/apollo-server/issues/3655 is addressed
// This will NOT work for:
// 1. Non-field directives - we can make it work for them, but will require a bit of work

import {
    DocumentNode,
    visit,
    FieldDefinitionNode,
    ASTNode,
    GraphQLObjectType,
    InterfaceTypeDefinitionNode,
    InterfaceTypeExtensionNode,
    ObjectTypeExtensionNode,
    ObjectTypeDefinitionNode,
    GraphQLInterfaceType,
    DirectiveNode,
} from 'graphql';
import {SchemaDirectiveVisitor} from 'graphql-tools';
import {buildFederatedSchema} from '@apollo/federation';
import {federationDirectives} from '@apollo/federation/dist/directives';
import {GraphQLResolverMap} from 'apollo-graphql';

interface DirectiveVisitors {
    [directiveName: string]: typeof SchemaDirectiveVisitor;
}

interface FederatedSchemaBase {
    typeDef: DocumentNode;
    resolvers: GraphQLResolverMap;
    schemaDirectives: DirectiveVisitors;
}

/** The idea is:
 * 1. Remove non-federation directives from SDL, save them to an array
 * 2. Run buildFederatedSchema on the directiveless SDL & original resolvers
 * 3. Re-add directives to final schema to allow SchemaDirectiveVisitor to work normally
 * 4. Finally, run SchemaDirectiveVisitors
 */

export function buildFederatedSchemaDirectivesHack({typeDef, resolvers, schemaDirectives}: FederatedSchemaBase) {
    const {directivesUsages, typeDef: typeDefWithoutDirectives} = collectAndRemoveCustomDirectives(typeDef);

    const schema = buildFederatedSchema({typeDefs: typeDefWithoutDirectives, resolvers});

    for (const {objectName, directiveNode, fieldName} of directivesUsages) {
        const object = schema.getType(objectName) as GraphQLObjectType | GraphQLInterfaceType;
        const field = object!.getFields()[fieldName];

        if (!field.astNode!.directives) {
            ((field.astNode!.directives as unknown) as DirectiveNode[]) = [directiveNode];
        } else {
            (field.astNode!.directives as DirectiveNode[]).push(directiveNode);
        }
    }

    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);

    return schema;
}

function collectAndRemoveCustomDirectives(typeDef: DocumentNode) {
    const directivesUsages: Array<{
        objectName: string;
        fieldName: string;
        directiveNode: DirectiveNode;
    }> = [];

    const typeDefWithoutDirectives = visit(typeDef, {
        DirectiveDefinition() {
            return null;
        },
        Directive(node, _key, _parent, _path, ancestors) {
            if (federationDirectives.some(directive => directive.name === node.name.value)) {
                return;
            }

            const objectNode = ancestors[ancestors.length - 3] as ASTNode;
            if (!isObjectOrInterfaceOrExtensionOfThose(objectNode)) {
                throw new Error(`Expected {Object,Interface}Type{Definition,Extension}Node, found ${objectNode.kind}`);
            }

            const fieldNode = ancestors[ancestors.length - 1] as ASTNode;
            if (!isFieldDefinitionNode(fieldNode)) {
                throw new Error(`Expected FieldDefinitionNode, found ${fieldNode.kind}`);
            }
            const objectName = objectNode.name.value;
            const fieldName = fieldNode.name.value;

            directivesUsages.push({directiveNode: node, objectName, fieldName});
            return null;
        },
    }) as DocumentNode;

    return {directivesUsages, typeDef: typeDefWithoutDirectives};
}

function isFieldDefinitionNode(node: ASTNode): node is FieldDefinitionNode {
    return node.kind === 'FieldDefinition';
}

type ObjectOrInterfaceOrExtensionOf =
    | ObjectTypeDefinitionNode
    | ObjectTypeExtensionNode
    | InterfaceTypeDefinitionNode
    | InterfaceTypeExtensionNode;

function isObjectOrInterfaceOrExtensionOfThose(node: ASTNode): node is ObjectOrInterfaceOrExtensionOf {
    return (
        node.kind === 'ObjectTypeDefinition' ||
        node.kind === 'ObjectTypeExtension' ||
        node.kind === 'InterfaceTypeDefinition' ||
        node.kind === 'InterfaceTypeExtension'
    );
}
