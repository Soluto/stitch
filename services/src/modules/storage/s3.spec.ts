import { minutesAgo } from '../../../tests/helpers/utility';
import { S3Storage } from '.';

let storage: S3Storage;

const mockListObjectsV2 = jest.fn();
jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn(() => ({
      listObjectsV2: mockListObjectsV2,
    })),
  };
});

beforeEach(() => {
  storage = new S3Storage('bucket', 'endpoint');
  mockListObjectsV2.mockReset();
});

describe('listFiles', () => {
  it('correctly handles truncated results with a continuation token', async () => {
    const folderPath = 'policyAttachments/';
    const expectedResult = [
      { filePath: `${folderPath}f1`, lastModified: minutesAgo(10) },
      { filePath: `${folderPath}f2`, lastModified: minutesAgo(7) },
      { filePath: `${folderPath}f3`, lastModified: minutesAgo(5) },
    ];

    mockListObjectsV2
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
    expect(mockListObjectsV2).toHaveBeenCalledTimes(3);
    expect(mockListObjectsV2).toHaveBeenNthCalledWith(1, listParams);
    expect(mockListObjectsV2).toHaveBeenNthCalledWith(2, { ...listParams, ContinuationToken: 'ct1' });
    expect(mockListObjectsV2).toHaveBeenNthCalledWith(3, { ...listParams, ContinuationToken: 'ct2' });
  });
});
