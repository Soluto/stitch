import { minutesAgo } from '../../../tests/helpers/utility';
import { S3Storage } from '.';

let storage: S3Storage;

const mockS3 = {
  listObjectsV2: jest.fn(),
  getObject: jest.fn(),
};
jest.mock('aws-sdk', () => ({ S3: jest.fn(() => mockS3) }));

beforeEach(() => {
  storage = new S3Storage('bucket', 'endpoint');
  Object.values(mockS3).forEach(m => m.mockReset());
});

describe('listFiles', () => {
  const folderPath = 'policyAttachments/';

  it('lists the files in a folder along with details on each file', async () => {
    const expectedResult = [
      { filePath: `${folderPath}f1`, lastModified: minutesAgo(10) },
      { filePath: `${folderPath}f2`, lastModified: minutesAgo(7) },
    ];

    mockS3.listObjectsV2.mockReturnValue({
      promise: () =>
        Promise.resolve({
          Contents: [
            { Key: expectedResult[0].filePath, LastModified: expectedResult[0].lastModified },
            { Key: expectedResult[1].filePath, LastModified: expectedResult[1].lastModified },
          ],
          IsTruncated: false,
        }),
    });

    const result = await storage.listFiles(folderPath);
    expect(result).toEqual(expectedResult);

    expect(mockS3.listObjectsV2).toHaveBeenCalledTimes(1);
    expect(mockS3.listObjectsV2).toHaveBeenCalledWith({ MaxKeys: 1000, Prefix: folderPath });
  });

  it('correctly handles truncated results with a continuation token', async () => {
    const expectedResult = [
      { filePath: `${folderPath}f1`, lastModified: minutesAgo(10) },
      { filePath: `${folderPath}f2`, lastModified: minutesAgo(7) },
      { filePath: `${folderPath}f3`, lastModified: minutesAgo(5) },
    ];

    mockS3.listObjectsV2
      .mockReturnValueOnce({
        promise: () =>
          Promise.resolve({
            Contents: [{ Key: expectedResult[0].filePath, LastModified: expectedResult[0].lastModified }],
            IsTruncated: true,
            ContinuationToken: 'ct1',
          }),
      })
      .mockReturnValueOnce({
        promise: () =>
          Promise.resolve({
            Contents: [{ Key: expectedResult[1].filePath, LastModified: expectedResult[1].lastModified }],
            IsTruncated: true,
            ContinuationToken: 'ct2',
          }),
      })
      .mockReturnValueOnce({
        promise: () =>
          Promise.resolve({
            Contents: [{ Key: expectedResult[2].filePath, LastModified: expectedResult[2].lastModified }],
            IsTruncated: false,
          }),
      });

    const result = await storage.listFiles(folderPath);
    expect(result).toEqual(expectedResult);

    const listParams: Partial<AWS.S3.Types.ListObjectsV2Request> = {
      MaxKeys: 1000,
      Prefix: folderPath,
    };
    expect(mockS3.listObjectsV2).toHaveBeenCalledTimes(3);
    expect(mockS3.listObjectsV2).toHaveBeenNthCalledWith(1, listParams);
    expect(mockS3.listObjectsV2).toHaveBeenNthCalledWith(2, { ...listParams, ContinuationToken: 'ct1' });
    expect(mockS3.listObjectsV2).toHaveBeenNthCalledWith(3, { ...listParams, ContinuationToken: 'ct2' });
  });
});

describe('readFile', () => {
  const filePath = 'policyAttachments/f1';
  const fileContent = 'file content';
  const etag = 'file etag';

  beforeEach(() => {
    mockS3.getObject.mockReturnValue({
      promise: () =>
        Promise.resolve({
          Body: Buffer.from(fileContent),
          ETag: etag,
        }),
    });
  });

  it('returns the file contents as a Buffer', async () => {
    const result = await storage.readFile(filePath);
    expect(result).toEqual({ content: Buffer.from(fileContent), etag });
    expect(mockS3.getObject).toHaveBeenCalledWith({ Key: filePath });
  });

  it('returns the file contents as a string when the asString option is sent', async () => {
    const result = await storage.readFile(filePath, { asString: true });
    expect(result).toEqual({ content: fileContent, etag });
    expect(mockS3.getObject).toHaveBeenCalledWith({ Key: filePath });
  });

  it('returns the file contents and etag only if the etag is different when the etag option is sent', async () => {
    const result = await storage.readFile(filePath, { etag: 'old etag', asString: true });
    expect(result).toEqual({ content: fileContent, etag });
    expect(mockS3.getObject).toHaveBeenCalledWith({ Key: filePath, IfNoneMatch: 'old etag' });
  });
});
