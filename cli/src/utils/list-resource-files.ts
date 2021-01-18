import { promises as fs } from 'fs';
import { join } from 'path';

export default async function (path: string, extensions = ['yaml', 'yml']) {
  const fileList: string[] = [];
  await walk(fileList, path, extensions);
  return fileList;
}

async function walk(fileList: string[], path: string, extensions = ['yaml', 'yml']) {
  const stat = await fs.stat(path);
  if (stat.isDirectory()) {
    const files = await fs.readdir(path);
    for (const file of files) {
      await walk(fileList, join(path, file), extensions);
    }
    return;
  }
  const isResource = extensions.some(ext => path.endsWith(`.${ext}`));
  if (isResource) {
    fileList.push(path);
  }
}
