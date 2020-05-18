import {promises as fs} from 'fs';
import * as path from 'path';
import {FileSystemResourceRepository} from './fs';

let repo: FileSystemResourceRepository;
const pathToResourcesFile = '/var/stitch/resources.json';
const policyAttachmentsFolderPath = '/var/stitch/policy-attachments';
let fsMocks: jest.Mock[];

beforeEach(() => {
    repo = new FileSystemResourceRepository(pathToResourcesFile, policyAttachmentsFolderPath);
    fsMocks = [];
});

afterEach(() => {
    for (const mock of fsMocks) (mock as any).__restore();
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

        const upToDateFilePath = path.resolve(policyAttachmentsFolderPath, 'upToDateFile');
        const needsUpdatingPath = path.resolve(policyAttachmentsFolderPath, 'needsUpdating');
        const newFilePath = path.resolve(policyAttachmentsFolderPath, 'newFile');

        const readdirMock = mockFsFunction('readdir');
        readdirMock.mockReturnValue(Promise.resolve(['upToDateFile', 'needsUpdating', 'newFile']));

        const statParamBasedReturnValues = {
            [upToDateFilePath]: {mtime: minutesAgo(10)},
            [needsUpdatingPath]: {mtime: minutesAgo(2)},
            [newFilePath]: {mtime: minutesAgo(3)},
        };
        const statMock = mockFsFunction('stat');
        statMock.mockImplementation(filePath => Promise.resolve(statParamBasedReturnValues[filePath]));

        const readFileParamBasedReturnValues = {
            [needsUpdatingPath]: Buffer.from('needs updating - updated'),
            [newFilePath]: Buffer.from('new file'),
        };
        const readFileMock = mockFsFunction('readFile');
        readFileMock.mockImplementation(filePath => Promise.resolve(readFileParamBasedReturnValues[filePath]));

        await refreshPolicyAttachments();

        expect(repo['policyAttachments']).toMatchObject({
            upToDateFile: Buffer.from('up to date'),
            needsUpdating: Buffer.from('needs updating - updated'),
            newFile: Buffer.from('new file'),
        });
        expect(repo['policyAttachmentsRefreshedAt'].getTime()).toBeGreaterThan(minutesAgo(1).getTime());

        expect(readdirMock).toHaveBeenCalledTimes(1);
        expect(readdirMock).toHaveBeenCalledWith(policyAttachmentsFolderPath);

        expect(statMock).toHaveBeenCalledTimes(3);
        expect(statMock).toHaveBeenCalledWith(upToDateFilePath);
        expect(statMock).toHaveBeenCalledWith(needsUpdatingPath);
        expect(statMock).toHaveBeenCalledWith(newFilePath);

        expect(readFileMock).toHaveBeenCalledTimes(2);
        expect(readFileMock).toHaveBeenCalledWith(needsUpdatingPath);
        expect(readFileMock).toHaveBeenCalledWith(newFilePath);
    });
});

function mockFsFunction(functionName: string): jest.Mock {
    const realFunction = (fs as any)[functionName];
    const mock: any = jest.fn();
    mock.__restore = () => ((fs as any)[functionName] = realFunction);
    (fs as any)[functionName] = mock;

    fsMocks.push(mock);
    return mock;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000);
