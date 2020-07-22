export interface Storage {
  fileStats(filePath: string): Promise<FileStats>;
  writeFile(filePath: string, content: string | Buffer): Promise<void>;
  listFiles(folderPath: string): Promise<listFilesItem[]>;

  readFile(filePath: string): Promise<{ content: Buffer }>;
  readFile(filePath: string, options: { asString?: false }): Promise<{ content: Buffer }>;
  readFile(filePath: string, options: { asString?: true }): Promise<{ content: string }>;
  readFile(filePath: string, options?: { asString?: boolean }): Promise<{ content: Buffer | string }>;
}

export type FileStats = {
  lastModified: Date;
};

export type listFilesItem = {
  filePath: string;
  lastModified: Date;
};
