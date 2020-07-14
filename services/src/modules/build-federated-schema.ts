// Hack until https://github.com/apollographql/apollo-server/issues/3655 is addressed
// This will NOT work for:
// 1. Non-field directives - we can make it work for them, but will require a bit of work

import {
  DocumentNode,
  visit,
  FieldDefinitionNode,
  ASTNode,
  InterfaceTypeDefinitionNode,
  InterfaceTypeExtensionNode,
  ObjectTypeExtensionNode,
  ObjectTypeDefinitionNode,
  DirectiveNode,
  printSchema,
  parse,
  GraphQLError,
  concatAST,
} from 'graphql';
import { makeExecutableSchema, SchemaDirectiveVisitor } from 'graphql-tools';
import { composeAndValidate } from '@apollo/federation';
import { GraphQLResolverMap } from 'apollo-graphql';
import { ApolloError } from 'apollo-server-core';

interface DirectiveVisitors {
  [directiveName: string]: typeof SchemaDirectiveVisitor;
}

interface FederatedSchemaBase {
  typeDefs: { [name: string]: DocumentNode };
  baseTypeDefs: DocumentNode;
  directiveTypeDefs: DocumentNode;
  resolvers: GraphQLResolverMap;
  schemaDirectives: DirectiveVisitors;
  schemaDirectivesContext: Record<string, unknown>;
}

type DirectivesUsagesByObjectName = Record<string, DirectiveNode[]>;
type DirectivesUsagesByObjectAndFieldNames = Record<string, Record<string, DirectiveNode[]>>;

export function buildSchemaFromFederatedTypeDefs({
  typeDefs,
  resolvers,
  baseTypeDefs,
  directiveTypeDefs,
  schemaDirectives,
  schemaDirectivesContext,
}: FederatedSchemaBase) {
  // Federation throws away non federation/builtin directives, so we need to do some shenanigans here

  // Remove non-federation directives from SDL, save them aside
  const serviceDefinitions = Object.entries(typeDefs).map(([name, originalTypeDef]) => {
    const { objectTypeDirectivesUsages, fieldDefinitionDirectivesUsages, typeDef } = collectAndRemoveCustomDirectives(
      originalTypeDef
    );

    return {
      objectTypeDirectivesUsages,
      fieldDefinitionDirectivesUsages,
      typeDefs: concatAST([baseTypeDefs, typeDef]),
      name,
      url: `https://stitch/${name}`,
    };
  });

  // Compose all SDLs together using federation
  const compositionResult = composeAndValidate(serviceDefinitions);
  if (compositionResult.errors.length > 0) {
    throw new ApolloError('Federation validation failed', 'FEDERATION_VALIDATION_FAILURE', {
      errors: compositionResult.errors.map(err => (err instanceof GraphQLError ? err : new GraphQLError(err!.message))),
    });
  }

  // Add directives back to the SDL
  const fullTypeDefWithoutDirectives = parse(printSchema(compositionResult.schema));
  const objectTypeDirectives = mergeObjectTypeDirectivesUsages(
    serviceDefinitions.map(sd => sd.objectTypeDirectivesUsages)
  );
  const fieldDefinitionDirectivesUsages = mergeFieldDefinitionDirectivesUsages(
    serviceDefinitions.map(sd => sd.fieldDefinitionDirectivesUsages)
  );
  const fullTypeDefWithDirectives = addDirectivesToTypeDefs(
    objectTypeDirectives,
    fieldDefinitionDirectivesUsages,
    fullTypeDefWithoutDirectives
  );

  // Create final schema, re-adding directive definitions and directive implementations
  const schema = makeExecutableSchema({
    typeDefs: [directiveTypeDefs, fullTypeDefWithDirectives],
    resolvers,
  });

  SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives, schemaDirectivesContext);

  return schema;
}

function addDirectivesToTypeDefs(
  objectTypeDirectives: DirectivesUsagesByObjectName,
  fieldDefinitionDirectives: DirectivesUsagesByObjectAndFieldNames,
  typeDef: DocumentNode
) {
  return visit(typeDef, {
    ObjectTypeDefinition(node) {
      const objectDirectives = objectTypeDirectives[node.name.value];

      if (!objectDirectives || objectDirectives.length === 0) {
        return;
      }

      const existingDirectives = node.directives ?? [];
      return { ...node, directives: [...existingDirectives, ...objectDirectives] };
    },

    FieldDefinition(node, _key, _parent, _path, ancestors) {
      const objectNode = ancestors[ancestors.length - 1] as ASTNode;
      if (!isObjectOrInterfaceOrExtensionOfThose(objectNode)) {
        throw new Error(`Expected {Object,Interface}Type{Definition,Extension}Node, found ${objectNode.kind}`);
      }

      const fieldDirectives =
        fieldDefinitionDirectives[objectNode.name.value] &&
        fieldDefinitionDirectives[objectNode.name.value][node.name.value];

      if (!fieldDirectives || fieldDirectives.length === 0) {
        return;
      }

      const existingDirectives = node.directives ?? [];
      return { ...node, directives: [...existingDirectives, ...fieldDirectives] };
    },
  });
}

// TODO:Check the list of apollo federation directives when upgrading apollo version
const federationDirectives = ['key', 'extends', 'external', 'requires', 'provides'];

export function collectAndRemoveCustomDirectives(typeDef: DocumentNode) {
  const objectTypeDirectivesUsages: DirectivesUsagesByObjectName = {};
  const fieldDefinitionDirectivesUsages: DirectivesUsagesByObjectAndFieldNames = {};

  const typeDefWithoutDirectives = visit(typeDef, {
    Directive(node, _key, _parent, _path, ancestors) {
      if (federationDirectives.some(directive => directive === node.name.value)) {
        return;
      }

      let objectNode = ancestors[ancestors.length - 1] as ASTNode;
      if (isObjectOrInterfaceOrExtensionOfThose(objectNode)) {
        const objectName = objectNode.name.value;

        if (!(objectName in objectTypeDirectivesUsages)) {
          objectTypeDirectivesUsages[objectName] = [];
        }
        objectTypeDirectivesUsages[objectName].push(node);

        return null;
      }

      objectNode = ancestors[ancestors.length - 3] as ASTNode;
      if (isObjectOrInterfaceOrExtensionOfThose(objectNode)) {
        const fieldNode = ancestors[ancestors.length - 1] as ASTNode;
        if (!isFieldDefinitionNode(fieldNode)) {
          throw new Error(`Expected FieldDefinitionNode, found ${fieldNode.kind}`);
        }

        const objectName = objectNode.name.value;
        const fieldName = fieldNode.name.value;

        if (!(objectName in fieldDefinitionDirectivesUsages)) {
          fieldDefinitionDirectivesUsages[objectName] = {};
        }

        if (!(fieldName in fieldDefinitionDirectivesUsages[objectName])) {
          fieldDefinitionDirectivesUsages[objectName][fieldName] = [];
        }

        fieldDefinitionDirectivesUsages[objectName][fieldName].push(node);

        return null;
      }
      throw new Error(`Expected {Object,Interface}Type{Definition,Extension}Node, found ${objectNode.kind}`);
    },
  }) as DocumentNode;

  return { objectTypeDirectivesUsages, fieldDefinitionDirectivesUsages, typeDef: typeDefWithoutDirectives };
}

function isFieldDefinitionNode(node: ASTNode): node is FieldDefinitionNode {
  return node.kind === 'FieldDefinition';
}

type ObjectOrInterfaceDefinitionOrExtension =
  | ObjectTypeDefinitionNode
  | ObjectTypeExtensionNode
  | InterfaceTypeDefinitionNode
  | InterfaceTypeExtensionNode;

function isObjectOrInterfaceOrExtensionOfThose(node: ASTNode): node is ObjectOrInterfaceDefinitionOrExtension {
  return (
    node.kind === 'ObjectTypeDefinition' ||
    node.kind === 'ObjectTypeExtension' ||
    node.kind === 'InterfaceTypeDefinition' ||
    node.kind === 'InterfaceTypeExtension'
  );
}

function mergeObjectTypeDirectivesUsages(dus: DirectivesUsagesByObjectName[]) {
  const result: DirectivesUsagesByObjectName = {};

  for (const du of dus) {
    for (const objectName in du) {
      const usages = du[objectName];

      if (!(objectName in result)) {
        result[objectName] = [];
      }

      result[objectName].push(...usages);
    }
  }

  return result;
}

function mergeFieldDefinitionDirectivesUsages(dus: DirectivesUsagesByObjectAndFieldNames[]) {
  const result: DirectivesUsagesByObjectAndFieldNames = {};

  for (const du of dus) {
    for (const objectName in du) {
      const fields = du[objectName];
      for (const fieldName in fields) {
        const usages = fields[fieldName];

        if (!(objectName in result)) {
          result[objectName] = {};
        }

        if (!(fieldName in result[objectName])) {
          result[objectName][fieldName] = [];
        }

        result[objectName][fieldName].push(...usages);
      }
    }
  }

  return result;
}
