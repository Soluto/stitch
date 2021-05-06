// Hack until https://github.com/apollographql/apollo-server/issues/3655 is addressed
// This will NOT work for:
// 1. Non-field directives - we can make it work for them, but will require a bit of work

import {
  DocumentNode,
  visit,
  EnumValueDefinitionNode,
  EnumTypeDefinitionNode,
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
import { IResolvers, makeExecutableSchema, SchemaDirectiveVisitor } from 'graphql-tools';
import { composeAndValidate } from '@apollo/federation';
import { ApolloError } from 'apollo-server-core';
import createTypeResolvers from '../implicit-type-resolver';
import { knownApolloDirectives } from '../config';
import logger from '../logger';
interface DirectiveVisitors {
  [directiveName: string]: typeof SchemaDirectiveVisitor;
}

interface FederatedSchemaBase {
  typeDefs: { [name: string]: DocumentNode };
  baseTypeDefs: DocumentNode;
  resolvers: IResolvers;
  schemaDirectives: DirectiveVisitors;
  schemaDirectivesContext: Record<string, unknown>;
}

type DirectivesUsagesByObjectName = Record<string, DirectiveNode[]>;
type DirectivesUsagesByObjectAndFieldNames = Record<string, Record<string, DirectiveNode[]>>;
type DirectivesUsagesByEnumName = Record<string, Record<string, DirectiveNode>>;
type DirectivesUsagesByEnumNameAndValue = Record<string, Record<string, Record<string, DirectiveNode>>>;

export function buildSchemaFromFederatedTypeDefs({
  typeDefs,
  resolvers,
  baseTypeDefs,
  schemaDirectives,
  schemaDirectivesContext,
}: FederatedSchemaBase) {
  // Federation throws away non federation/builtin directives, so we need to do some shenanigans here

  // Remove non-federation directives from SDL, save them aside
  const serviceDefinitions = Object.entries(typeDefs).map(([name, originalTypeDef]) => {
    const {
      objectTypeDirectivesUsages,
      fieldDefinitionDirectivesUsages,
      enumTypeDirectivesUsages,
      enumValueDirectivesUsages,
      typeDef,
    } = collectAndRemoveCustomDirectives(originalTypeDef);

    return {
      objectTypeDirectivesUsages,
      fieldDefinitionDirectivesUsages,
      enumTypeDirectivesUsages,
      enumValueDirectivesUsages,
      typeDefs: concatAST([baseTypeDefs, typeDef]),
      name,
      url: `https://stitch/${name}`,
    };
  });

  // Compose all SDLs together using federation
  const compositionResult = composeAndValidate(serviceDefinitions);
  const compositionErrors = compositionResult.errors ?? [];
  if (compositionErrors.length > 0) {
    logger.error({ compositionErrors }, 'Schema federation validation failed');
    throw new ApolloError('Schema federation validation failed', 'FEDERATION_VALIDATION_FAILURE', {
      errors: compositionErrors.map(err => (err instanceof GraphQLError ? err : new GraphQLError(err!.message))),
    });
  }

  // Add directives back to the SDL
  const fullTypeDefWithoutDirectives = parse(printSchema(compositionResult.schema));
  const objectTypeDirectives = mergeObjectTypeDirectivesUsages(
    serviceDefinitions.map(sd => sd.objectTypeDirectivesUsages)
  );
  const fieldDefinitionDirectives = mergeFieldDefinitionDirectivesUsages(
    serviceDefinitions.map(sd => sd.fieldDefinitionDirectivesUsages)
  );

  const enumTypeDirectives = mergeEnumTypeDirectivesUsages(serviceDefinitions.map(sd => sd.enumTypeDirectivesUsages));

  const enumValueDirectives = mergeEnumValueDirectivesUsages(
    serviceDefinitions.map(sd => sd.enumValueDirectivesUsages)
  );

  const fullTypeDefWithDirectives = addDirectivesToTypeDefs(
    objectTypeDirectives,
    fieldDefinitionDirectives,
    enumTypeDirectives,
    enumValueDirectives,
    fullTypeDefWithoutDirectives
  );

  // Create typeResolvers for interfaces and unions
  const typeResolvers = createTypeResolvers(fullTypeDefWithDirectives);

  const directiveTypeDefs = baseTypeDefs.definitions.filter(td => td.kind === 'DirectiveDefinition');

  // Create final schema, re-adding directive definitions and directive implementations
  const schema = makeExecutableSchema({
    typeDefs: [...directiveTypeDefs, fullTypeDefWithDirectives],
    resolvers: [resolvers, typeResolvers],
  });

  SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives, schemaDirectivesContext);

  return schema;
}

function addDirectivesToTypeDefs(
  objectTypeDirectives: DirectivesUsagesByObjectName,
  fieldDefinitionDirectives: DirectivesUsagesByObjectAndFieldNames,
  enumTypeDirectives: DirectivesUsagesByEnumName,
  enumValueDirectives: DirectivesUsagesByEnumNameAndValue,
  typeDef: DocumentNode
): DocumentNode {
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

    EnumTypeDefinition(node) {
      const enumDirectives = enumTypeDirectives[node.name.value];

      if (!enumDirectives || Object.keys(enumDirectives).length === 0) {
        return;
      }

      const existingDirectives = node.directives ?? [];
      return { ...node, directives: [...existingDirectives, ...Object.values(enumDirectives)] };
    },

    EnumValueDefinition(node, _key, _parent, _path, ancestors) {
      const enumNode = ancestors[ancestors.length - 1] as ASTNode;
      if (!isEnumTypeDefinitionNode(enumNode)) {
        throw new Error(`Expected EnumTypeDefinitionNode, found ${enumNode.kind}`);
      }

      const enumValDirectives =
        enumValueDirectives[enumNode.name.value] && enumValueDirectives[enumNode.name.value][node.name.value];

      if (!enumValDirectives || Object.keys(enumValDirectives).length === 0) {
        return;
      }

      const existingDirectives = node.directives ?? [];
      return { ...node, directives: [...existingDirectives, ...Object.values(enumValDirectives)] };
    },
  });
}

export function collectAndRemoveCustomDirectives(typeDef: DocumentNode) {
  const objectTypeDirectivesUsages: DirectivesUsagesByObjectName = {};
  const fieldDefinitionDirectivesUsages: DirectivesUsagesByObjectAndFieldNames = {};
  const enumTypeDirectivesUsages: DirectivesUsagesByEnumName = {};
  const enumValueDirectivesUsages: DirectivesUsagesByEnumNameAndValue = {};

  const typeDefWithoutDirectives = visit(typeDef, {
    Directive(node, _key, _parent, _path, ancestors) {
      if (knownApolloDirectives.has(node.name.value)) {
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

      if (isEnumTypeDefinitionNode(objectNode)) {
        const enumName = objectNode.name.value;

        if (!(enumName in enumTypeDirectivesUsages)) {
          enumTypeDirectivesUsages[enumName] = {};
        }
        if (!(node.name.value in enumTypeDirectivesUsages[enumName])) {
          enumTypeDirectivesUsages[enumName][node.name.value] = node;
        }

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

      if (isEnumTypeDefinitionNode(objectNode)) {
        const enumValueNode = ancestors[ancestors.length - 1] as ASTNode;
        if (!isEnumValueDefinitionNode(enumValueNode)) {
          throw new Error(`Expected EnumValueDefinitionNode, found ${enumValueNode.kind}`);
        }

        const enumName = objectNode.name.value;
        const enumValueName = enumValueNode.name.value;

        if (!(enumName in enumValueDirectivesUsages)) {
          enumValueDirectivesUsages[enumName] = {};
        }

        if (!(enumValueName in enumValueDirectivesUsages[enumName])) {
          enumValueDirectivesUsages[enumName][enumValueName] = {};
        }

        if (!(node.name.value in enumValueDirectivesUsages[enumName][enumValueName])) {
          enumValueDirectivesUsages[enumName][enumValueName][node.name.value] = node;
        }

        return null;
      }
      throw new Error(`Expected {Object,Interface}Type{Definition,Extension}Node, found ${objectNode.kind}`);
    },
  }) as DocumentNode;

  return {
    objectTypeDirectivesUsages,
    fieldDefinitionDirectivesUsages,
    enumTypeDirectivesUsages,
    enumValueDirectivesUsages,
    typeDef: typeDefWithoutDirectives,
  };
}

function isFieldDefinitionNode(node: ASTNode): node is FieldDefinitionNode {
  return node.kind === 'FieldDefinition';
}

function isEnumTypeDefinitionNode(node: ASTNode): node is EnumTypeDefinitionNode {
  return node.kind === 'EnumTypeDefinition';
}

function isEnumValueDefinitionNode(node: ASTNode): node is EnumValueDefinitionNode {
  return node.kind === 'EnumValueDefinition';
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

function mergeEnumTypeDirectivesUsages(dus: DirectivesUsagesByEnumName[]) {
  const result: DirectivesUsagesByEnumName = {};

  for (const du of dus) {
    for (const objectName in du) {
      const usages = du[objectName];

      if (!(objectName in result)) {
        result[objectName] = {};
      }

      result[objectName] = usages;
    }
  }

  return result;
}

function mergeEnumValueDirectivesUsages(dus: DirectivesUsagesByEnumNameAndValue[]) {
  const result: DirectivesUsagesByEnumNameAndValue = {};

  for (const du of dus) {
    for (const objectName in du) {
      const fields = du[objectName];
      for (const fieldName in fields) {
        const usages = fields[fieldName];

        if (!(objectName in result)) {
          result[objectName] = {};
        }

        if (!(fieldName in result[objectName])) {
          result[objectName][fieldName] = {};
        }

        result[objectName][fieldName] = usages;
      }
    }
  }

  return result;
}
