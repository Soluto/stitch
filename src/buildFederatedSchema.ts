// Hack until https://github.com/apollographql/apollo-server/issues/3655 is addressed
// This will NOT work for:
// 1. Non-field directives - we can make it work for them, but will require a bit of work

import {
    DocumentNode,
    visit,
    FieldDefinitionNode,
    ASTNode,
    GraphQLObjectType,
    ArgumentNode,
    ObjectFieldNode,
    valueFromASTUntyped,
    InterfaceTypeDefinitionNode,
    InterfaceTypeExtensionNode,
    ObjectTypeExtensionNode,
    ObjectTypeDefinitionNode,
    GraphQLInterfaceType,
} from 'graphql';
import {SchemaDirectiveVisitor} from 'graphql-tools';
import {buildFederatedSchema} from '@apollo/federation';
import {federationDirectives} from '@apollo/federation/dist/directives';

type DirectiveVisitors = {[directiveName: string]: typeof SchemaDirectiveVisitor};

export function buildFederatedSchemaDirectivesHack(typeDefs: DocumentNode, directiveVisitors: DirectiveVisitors) {
    const directives: Array<{
        objectName: string;
        directiveName: string;
        fieldName: string;
        args: {[name: string]: any};
    }> = [];
    const defsWithoutDirectives = visit(typeDefs, {
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
            const directiveName = node.name.value;

            directives.push({directiveName, objectName, fieldName, args: argumentsToDictionary(node.arguments)});
            return null;
        },
    }) as DocumentNode;

    const schema = buildFederatedSchema(defsWithoutDirectives);
    for (const {objectName, directiveName, fieldName, args} of directives) {
        const directiveVisitor = directiveVisitors[directiveName];
        // @ts-ignore SchemaDirectiveVisitor constructor is protected...
        const visitor = new directiveVisitor({
            name: directiveName,
            args,
            visitedType: schema,
            schema,
            context: {},
        }) as SchemaDirectiveVisitor;
        const object = schema.getType(objectName) as GraphQLObjectType | GraphQLInterfaceType;
        const field = object!.getFields()[fieldName];
        visitor.visitFieldDefinition(field, {objectType: object});
    }

    return schema;
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

function argumentsToDictionary(argsArr?: readonly ArgumentNode[] | readonly ObjectFieldNode[]) {
    const argsDict: {[name: string]: any} = {};
    if (typeof argsArr === 'undefined') {
        return argsDict;
    }

    for (const arg of argsArr) {
        argsDict[arg.name.value] = valueFromASTUntyped(arg.value);
    }

    return argsDict;
}
