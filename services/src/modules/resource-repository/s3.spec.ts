import {S3ResourceRepository} from './s3';

let repo: S3ResourceRepository;
let s3Mock: any;
const policyAttachmentsKeyPrefix = 'policyAttachments/';
const bucketName = 'bucket';

beforeEach(() => {
    s3Mock = {
        getObject: jest.fn(() => ({promise: () => Promise.resolve()})),
        listObjectsV2: jest.fn(() => ({promise: () => Promise.resolve()})),
    };

    repo = new S3ResourceRepository({
        s3: s3Mock as any,
        bucketName,
        objectKey: 'key',
        policyAttachmentsKeyPrefix,
    });
});

describe('shouldRefreshPolicyAttachment', () => {
    let shouldRefreshPolicyAttachment: Function;

    beforeEach(() => {
        shouldRefreshPolicyAttachment = repo['shouldRefreshPolicyAttachment'].bind(repo);
    });

    it('returns true if the given file does not currently exist in memory', () => {
        repo['policyAttachmentsRefreshedAt'] = new Date();

        const result = shouldRefreshPolicyAttachment({filename: 'file', updatedAt: minutesAgo(5)});
        expect(result).toBe(true);
    });

    it('returns true if this is the first refresh for this process', () => {
        repo['policyAttachments']['file'] = Buffer.from('content');

        const result = shouldRefreshPolicyAttachment({filename: 'file', updatedAt: minutesAgo(5)});
        expect(result).toBe(true);
    });

    it('returns true if the attachment was last updated after the last refresh', () => {
        repo['policyAttachments']['file'] = Buffer.from('content');
        repo['policyAttachmentsRefreshedAt'] = minutesAgo(5);

        const result = shouldRefreshPolicyAttachment({filename: 'file', updatedAt: new Date()});
        expect(result).toBe(true);
    });

    it('returns false if the attachment was last updated before the last refresh', () => {
        repo['policyAttachments']['file'] = Buffer.from('content');
        repo['policyAttachmentsRefreshedAt'] = new Date();

        const result = shouldRefreshPolicyAttachment({filename: 'file', updatedAt: minutesAgo(5)});
        expect(result).toBe(false);
    });
});

describe('refreshPolicyAttachments', () => {
    let refreshPolicyAttachments: Function;

    beforeEach(() => {
        refreshPolicyAttachments = repo['refreshPolicyAttachments'].bind(repo);
    });

    it('refreshes the local copy of all policy attachments that should be refreshed', async () => {
        repo['policyAttachments'] = {
            upToDateFile: Buffer.from('up to date'),
            needsUpdating: Buffer.from('needs updating'),
        };
        repo['policyAttachmentsRefreshedAt'] = minutesAgo(5);

        s3Mock.listObjectsV2 = jest.fn().mockReturnValue({
            promise: () =>
                Promise.resolve({
                    Contents: [
                        {Key: `${policyAttachmentsKeyPrefix}upToDateFile`, LastModified: minutesAgo(10)},
                        {Key: `${policyAttachmentsKeyPrefix}needsUpdating`, LastModified: minutesAgo(2)},
                        {Key: `${policyAttachmentsKeyPrefix}newFile`, LastModified: minutesAgo(3)},
                    ],
                    IsTruncated: false,
                }),
        });

        const paramBasedReturnValues = {
            [`${policyAttachmentsKeyPrefix}needsUpdating`]: {Body: Buffer.from('needs updating - updated')},
            [`${policyAttachmentsKeyPrefix}newFile`]: {Body: Buffer.from('new file')},
        };
        s3Mock.getObject = jest.fn(({Key}) => ({
            promise: () => {
                return Promise.resolve(paramBasedReturnValues[Key]);
            },
        }));

        await refreshPolicyAttachments();

        expect(repo['policyAttachments']).toMatchObject({
            upToDateFile: Buffer.from('up to date'),
            needsUpdating: Buffer.from('needs updating - updated'),
            newFile: Buffer.from('new file'),
        });
        expect(repo['policyAttachmentsRefreshedAt'].getTime()).toBeGreaterThan(minutesAgo(1).getTime());

        expect(s3Mock.listObjectsV2).toHaveBeenCalledTimes(1);
        expect(s3Mock.listObjectsV2).toHaveBeenCalledWith({
            Bucket: bucketName,
            MaxKeys: 1000,
            Prefix: policyAttachmentsKeyPrefix,
        });

        expect(s3Mock.getObject).toHaveBeenCalledTimes(2);
        expect(s3Mock.getObject).toHaveBeenCalledWith({
            Bucket: bucketName,
            Key: `${policyAttachmentsKeyPrefix}needsUpdating`,
        });
        expect(s3Mock.getObject).toHaveBeenCalledWith({
            Bucket: bucketName,
            Key: `${policyAttachmentsKeyPrefix}newFile`,
        });
    });
});

describe('getPolicyAttachmentsList', () => {
    let getPolicyAttachmentsList: Function;

    beforeEach(() => {
        getPolicyAttachmentsList = repo['getPolicyAttachmentsList'].bind(repo);
    });

    it('correctly handles truncated results with a continuation token', async () => {
        const expectedResult = [
            {filename: 'f1', updatedAt: minutesAgo(10)},
            {filename: 'f2', updatedAt: minutesAgo(7)},
            {filename: 'f3', updatedAt: minutesAgo(5)},
        ];

        const listMock = jest
            .fn()
            .mockReturnValueOnce({
                promise: () =>
                    Promise.resolve({
                        Contents: [{Key: `${policyAttachmentsKeyPrefix}f1`, LastModified: expectedResult[0].updatedAt}],
                        IsTruncated: true,
                        ContinuationToken: 'ct1',
                    }),
            })
            .mockReturnValueOnce({
                promise: () =>
                    Promise.resolve({
                        Contents: [{Key: `${policyAttachmentsKeyPrefix}f2`, LastModified: expectedResult[1].updatedAt}],
                        IsTruncated: true,
                        ContinuationToken: 'ct2',
                    }),
            })
            .mockReturnValueOnce({
                promise: () =>
                    Promise.resolve({
                        Contents: [{Key: `${policyAttachmentsKeyPrefix}f3`, LastModified: expectedResult[2].updatedAt}],
                        IsTruncated: false,
                    }),
            });
        s3Mock.listObjectsV2 = listMock;

        const result = await getPolicyAttachmentsList();

        expect(result).toEqual(expectedResult);

        const listParams: any = {
            Bucket: bucketName,
            MaxKeys: 1000,
            Prefix: policyAttachmentsKeyPrefix,
        };
        expect(listMock).toHaveBeenCalledTimes(3);
        expect(listMock).toHaveBeenNthCalledWith(1, listParams);
        expect(listMock).toHaveBeenNthCalledWith(2, {...listParams, ContinuationToken: 'ct1'});
        expect(listMock).toHaveBeenNthCalledWith(3, {...listParams, ContinuationToken: 'ct2'});
    });
});

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000);
