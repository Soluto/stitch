import { promises as fs } from 'fs';
import { join } from 'path';
import * as globby from 'globby';
import { DocumentNode, Kind, ObjectTypeDefinitionNode, parse, print } from 'graphql';
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

const rootObjectDefinitionTypes = ['Query', 'Mutation', 'Subscription'];

function mergeSchemaDocuments(schemas: DocumentNode[]): DocumentNode {
  const allDefinitions = schemas.flatMap(s => s.definitions);
  const definitionGroups = R.groupBy(d => d.kind, allDefinitions);

  definitionGroups[Kind.OBJECT_TYPE_DEFINITION] = handleObjectTypeDefinitions(
    definitionGroups[Kind.OBJECT_TYPE_DEFINITION] as ObjectTypeDefinitionNode[]
  );

  const definitions = R.pipe(R.values, R.flatten)(definitionGroups);

  return {
    kind: 'Document',
    definitions,
  };
}

function handleObjectTypeDefinitions(objectTypeDefinitions: ObjectTypeDefinitionNode[]) {
  if (!objectTypeDefinitions) return [];
  const mergedTypes: ObjectTypeDefinitionNode[] = [];
  rootObjectDefinitionTypes.forEach(rootType => handleRootType(rootType, objectTypeDefinitions, mergedTypes));

  const uniqueObjectTypeDefinitions = objectTypeDefinitions
    .filter(o => !rootObjectDefinitionTypes.includes(o.name.value))
    .concat(mergedTypes);

  const dupObjects = R.pipe(
    R.groupBy((o: ObjectTypeDefinitionNode) => o.name.value),
    R.values,
    R.find(objs => objs.length > 1)
  )(uniqueObjectTypeDefinitions);

  if (dupObjects) {
    throw new Error(`Duplicate object type definitions: ${dupObjects[0].name.value}`);
  }

  return uniqueObjectTypeDefinitions;
}

function handleRootType(
  typeName: string,
  objectTypeDefinitions: ObjectTypeDefinitionNode[],
  mergedTypes: ObjectTypeDefinitionNode[]
) {
  const rootTypes = objectTypeDefinitions.filter(o => o.name.value === typeName);
  if (rootTypes?.length >= 1) {
    mergedTypes.push(mergeObjectTypeDefinitions(rootTypes));
  }
}

function mergeObjectTypeDefinitions(typeDefs: ObjectTypeDefinitionNode[]): ObjectTypeDefinitionNode {
  if (typeDefs.length === 1) return typeDefs[0];
  return {
    ...typeDefs[0],
    fields: typeDefs.flatMap(t => t.fields ?? []),
  };
}
