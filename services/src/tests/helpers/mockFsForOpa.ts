import { promises as fs } from 'fs';

export function mock() {
  const realWriteFile = fs.writeFile;
  const realUnlink = fs.unlink;
  const realReadFile = fs.readFile;

  const writeFileMock: any = jest.fn(() => Promise.resolve());
  writeFileMock.__restore = () => (fs.writeFile = realWriteFile);
  fs.writeFile = writeFileMock;

  const unlinkMock: any = jest.fn(() => Promise.resolve());
  unlinkMock.__restore = () => (fs.unlink = realUnlink);
  fs.unlink = unlinkMock;

  const readFileMock: any = jest.fn(() => Promise.resolve('compiled rego code'));
  readFileMock.__restore = () => (fs.readFile = realReadFile);
  fs.readFile = readFileMock;
}

export function restore() {
  (fs.writeFile as any).__restore();
  (fs.unlink as any).__restore();
  (fs.readFile as any).__restore();
}

export default { mock, restore };
