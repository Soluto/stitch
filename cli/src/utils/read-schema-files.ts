import { promises as fs } from 'fs';
import { join } from 'path';
import * as globby from 'globby';
import {
  DocumentNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputObjectTypeExtensionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  InterfaceTypeExtensionNode,
  NameNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  parse,
  print,
  TypeDefinitionNode,
  TypeExtensionNode,
  UnionTypeDefinitionNode,
  UnionTypeExtensionNode,
} from 'graphql';
import * as R from 'ramda';
import { ResourceMetadataInput, SchemaInput } from '../client';

interface SchemaFilesInput {
  metadata: ResourceMetadataInput;
  schemaFiles: string[];
}

export default async function ({ metadata, schemaFiles }: SchemaFilesInput, cwd: string): Promise<SchemaInput> {
  const files = await globby(schemaFiles, { cwd });
  const fileContents = await Promise.all(files.map(f => fs.readFile(join(cwd, f), { encoding: 'utf8' })));
  const schemas = fileContents.map(file => parse(file));
  const schema = print(mergeSchemaDocuments(schemas));
  return {
    metadata,
    schema,
  };
}

type DefOrExtNode = {
  [K in keyof TypeDefinitionNode & keyof TypeExtensionNode]: TypeDefinitionNode[K] | TypeExtensionNode[K];
};

function mergeSchemaDocuments(schemas: DocumentNode[]) {
  const typeDefinitions = schemas.flatMap(s => s.definitions).map(d => d as DefOrExtNode);
  const typeDefinitionsMap = new Map<string, DefOrExtNode>();
  for (const nextTypeDef of typeDefinitions) {
    const kind = nextTypeDef.kind.replace('Extension', 'Definition');
    const typeDefKey = `${kind}||${nextTypeDef.name.value}`;
    const prevTypeDef = typeDefinitionsMap.get(typeDefKey);
    if (!prevTypeDef) {
      typeDefinitionsMap.set(typeDefKey, nextTypeDef);
      continue;
    }
    typeDefinitionsMap.set(typeDefKey, mergeTypeDefs(prevTypeDef, nextTypeDef));
  }
  return { kind: 'Document', definitions: Array.from(typeDefinitionsMap.values()) } as DocumentNode;
}

function mergeTypeDefs(typeDefA: DefOrExtNode, typeDefB: DefOrExtNode): DefOrExtNode {
  validateSameTypeDefs(typeDefA, typeDefB);

  const directives = R.concat(typeDefA.directives || [], typeDefB.directives || []);
  let result = {
    ...R.clone(typeDefA),
    directives,
  };

  if (hasFields(typeDefA) && hasFields(typeDefB)) {
    const fields = mergeFields(
      typeDefA.name.value,
      ((typeDefA as DefOrExtNodeWithFields).fields || []) as Field[],
      ((typeDefB as DefOrExtNodeWithFields).fields || []) as Field[]
    );
    result = R.assoc('fields', fields, result);
  }

  if (isUnionNode(typeDefA) && isUnionNode(typeDefB)) {
    const types = R.unionWith(
      R.equals,
      (typeDefA as DefOrExtNodeWithTypes).types || [],
      (typeDefB as DefOrExtNodeWithTypes).types || []
    );
    result = R.assoc('types', types, result);
  }

  if (isObjectNode(typeDefA) && isObjectNode(typeDefB)) {
    const interfaces = R.unionWith(
      R.equals,
      (typeDefA as DefOrExtNodeWithInterfaces).interfaces || [],
      (typeDefB as DefOrExtNodeWithInterfaces).interfaces || []
    );
    result = R.assoc('interfaces', interfaces, result);
  }

  if (typeDefB.kind.endsWith('Extension')) {
    result = R.assoc('kind', typeDefB.kind, result);
  }

  return result;
}

type DefOrExtNodeWithFields =
  | ObjectTypeDefinitionNode
  | InterfaceTypeDefinitionNode
  | InputObjectTypeDefinitionNode
  | ObjectTypeExtensionNode
  | InterfaceTypeExtensionNode
  | InputObjectTypeExtensionNode;

function hasFields(x: DefOrExtNode) {
  return [
    'ObjectTypeDefinition',
    'InterfaceTypeDefinition',
    'InputObjectTypeDefinition',
    'ObjectTypeExtension',
    'InterfaceTypeExtension',
    'InputObjectTypeExtension',
  ].includes(x.kind);
}

type DefOrExtNodeWithTypes = UnionTypeDefinitionNode | UnionTypeExtensionNode;

function isUnionNode(x: DefOrExtNode) {
  return x.kind === 'UnionTypeDefinition' || x.kind === 'UnionTypeExtension';
}

type DefOrExtNodeWithInterfaces = ObjectTypeDefinitionNode | ObjectTypeExtensionNode;

function isObjectNode(x: DefOrExtNode) {
  return x.kind === 'ObjectTypeDefinition' || x.kind === 'ObjectTypeExtension';
}

type Field = {
  [K in keyof FieldDefinitionNode & keyof InputValueDefinitionNode]:
    | FieldDefinitionNode[K]
    | InputValueDefinitionNode[K];
};

function mergeFields(type: string, l: Field[], r: Field[]) {
  return R.pipe(
    R.groupBy((fieldDef: Field) => name(fieldDef)),
    R.values,
    R.map(mergeSameFieldDefinitions(type)),
    R.flatten
  )([...l, ...r]);
}

function mergeSameFieldDefinitions(type: string) {
  return function (fieldDefinitions: Field[]): Field[] {
    if (fieldDefinitions.length === 0) return [];
    if (fieldDefinitions.length === 1) return fieldDefinitions;

    const [fieldDefA, fieldDefB, ...rest] = fieldDefinitions;
    validateSameFieldDefs(type, fieldDefA, fieldDefB);

    const { directives, ...otherFields } = fieldDefA;
    const fieldWithMergedDirectives = {
      ...otherFields,
      directives: R.uniq([...directives!, ...fieldDefB.directives!]),
    };

    return mergeSameFieldDefinitions(type)([fieldWithMergedDirectives, ...rest]);
  };
}

function validateSameFieldDefs(type: string, fieldDefA: Field, fieldDefB: Field) {
  const fieldDefWithNoDirectivesA = R.omit(['directives', 'loc'], fieldDefA);
  const fieldDefWithNoDirectivesB = R.omit(['directives', 'loc'], fieldDefB);
  if (!R.equals(fieldDefWithNoDirectivesA, fieldDefWithNoDirectivesB)) {
    throw `Same field definition should be identical except for directives - type: ${type} field: ${name(fieldDefA)}`;
  }
}

function validateSameTypeDefs(typeDefA: DefOrExtNode, typeDefB: DefOrExtNode) {
  if (!typeDefA.kind.endsWith('Extension') && !typeDefB.kind.endsWith('Extension') && !isRootType(typeDefA)) {
    throw `Same types should be extension one of another - kind: ${typeDefA.kind} name: ${name(typeDefA)}`;
  }
}

function name(definition: { name: NameNode }): string {
  return definition.name.value;
}

function isRootType(typeDef: DefOrExtNode) {
  return ['Query', 'Mutation', 'Subscription'].includes(name(typeDef));
}
