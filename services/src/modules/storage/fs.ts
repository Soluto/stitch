import * as path from 'path';
import { promises as fs } from 'fs';
import pLimit from 'p-limit';
import { Storage, FileStats, listFilesItem } from '.';

export class FileSystemStorage implements Storage {
  async fileStats(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath);

    return { lastModified: stats.mtime };
  }

  async readFile(filePath: string): Promise<{ content: Buffer }>;
  async readFile(filePath: string, options: { [k in any]: never }): Promise<{ content: Buffer }>;
  async readFile(filePath: string, options: { asString?: true }): Promise<{ content: string }>;
  async readFile(filePath: string, options: { asString?: boolean } = {}): Promise<{ content: Buffer | string }> {
    if (options.asString) return { content: await fs.readFile(filePath, 'utf8') };

    return { content: await fs.readFile(filePath) };
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    await fs.writeFile(filePath, content);
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async listFiles(folderPath: string): Promise<listFilesItem[]> {
    const filenames = await fs.readdir(folderPath);
    const limit = pLimit(10);

    return Promise.all(
      filenames.map(filename => {
        return limit(async () => {
          const filePath = path.resolve(folderPath, filename);
          const { lastModified } = await this.fileStats(filePath);

          return { filePath, lastModified };
        });
      })
    );
  }

  async mkdir(folderPath: string, options?: { recursive: true }): Promise<void> {
    await fs.mkdir(folderPath, options);
  }
}
