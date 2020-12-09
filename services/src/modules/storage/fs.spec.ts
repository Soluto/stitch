import { PathLike, promises as fs } from 'fs';
import { mocked } from 'ts-jest/utils';
import { minutesAgo } from '../../../tests/helpers/utility';
import { FileSystemStorage } from '.';

let storage: FileSystemStorage;

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

const mockedFs = mocked(fs, true);

beforeEach(() => {
  storage = new FileSystemStorage();
  Object.values(mockedFs).forEach(m => m.mockReset());
});

describe('readFile', () => {
  const filePath = '/var/someFile';
  const fileContent = 'file content';

  it('returns the file contents as a Buffer', async () => {
    mockedFs.readFile.mockResolvedValue(Buffer.from(fileContent));

    const result = await storage.readFile(filePath);
    expect(result).toEqual({ content: Buffer.from(fileContent) });
    expect(fs.readFile).toHaveBeenCalledWith(filePath);
  });

  it('returns the file contents as a string when the asString option is sent', async () => {
    mockedFs.readFile.mockResolvedValue(fileContent);

    const result = await storage.readFile(filePath, { asString: true });
    expect(result).toEqual({ content: fileContent });
    expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
  });
});

describe('listFiles', () => {
  const folderPath = '/var/someFolder/';

  it('lists the files in a folder along with details on each file', async () => {
    const expectedResult = [
      { filePath: `${folderPath}f1`, lastModified: minutesAgo(10) },
      { filePath: `${folderPath}f2`, lastModified: minutesAgo(7) },
    ];

    (mockedFs.readdir as jest.Mock).mockResolvedValue(['f1', 'f2']);

    const statParamBasedReturnValues = {
      [expectedResult[0].filePath]: expectedResult[0].lastModified,
      [expectedResult[1].filePath]: expectedResult[1].lastModified,
    };
    const statMock = (filePath: string) => Promise.resolve({ mtime: statParamBasedReturnValues[filePath] });
    (mockedFs.stat as jest.Mock).mockImplementation(statMock);

    const result = await storage.listFiles(folderPath);
    expect(result).toEqual(expectedResult);

    expect(mockedFs.readdir as (path: PathLike) => Promise<string[]>).toHaveBeenCalledWith(folderPath);
    expect(mockedFs.stat).toHaveBeenCalledTimes(2);
    expect(mockedFs.stat).toHaveBeenCalledWith(expectedResult[0].filePath);
    expect(mockedFs.stat).toHaveBeenCalledWith(expectedResult[1].filePath);
  });
});
