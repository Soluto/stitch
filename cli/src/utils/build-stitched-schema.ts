import { promises as fs } from 'fs';
import * as fg from 'fast-glob';
import { ResourceMetadataInput, SchemaInput } from '../client';

interface SchemaV2 {
  metadata: ResourceMetadataInput;
  schemaFiles: string[];
}

export default async function ({ metadata, schemaFiles }: SchemaV2): Promise<SchemaInput> {
  const files = await fg(schemaFiles);
  const fileContents = await Promise.all(files.map(f => fs.readFile(f, { encoding: 'utf8' })));
  const schema = fileContents.join('\n\n');
  return {
    metadata,
    schema,
  };
}
