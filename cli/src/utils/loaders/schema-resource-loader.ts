import { promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import * as globby from 'globby';
import { DocumentNode, Kind, ObjectTypeDefinitionNode, parse, print } from 'graphql';
import * as R from 'ramda';
import { ResourceMetadataInput, SchemaInput } from '../../client';

interface SchemaResourceInput {
  metadata: ResourceMetadataInput;
  schema?: string;
  schemaFiles?: string[];
}

export default async function (schemaResource: SchemaResourceInput, resourceFile: string): Promise<SchemaInput> {
  const schemaStrList: string[] = [];
  if (schemaResource.schema) {
    schemaStrList.push(schemaResource.schema);
  }

  if (schemaResource.schemaFiles) {
    const fileContents = await loadSchemaFiles(schemaResource.schemaFiles, resourceFile);
    schemaStrList.push(...fileContents);
  }

  const schemas = schemaStrList.map(s => parse(s));
  const schema = print(mergeSchemaDocuments(schemas));
  return {
    metadata: schemaResource.metadata,
    schema,
  };
}

async function loadSchemaFiles(schemaFiles: string[], resourceFile: string): Promise<string[]> {
  const cwd = resolve(dirname(resourceFile));
  const files = await globby(schemaFiles, { cwd });
  return Promise.all(files.map(f => fs.readFile(join(cwd, f), { encoding: 'utf8' })));
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
