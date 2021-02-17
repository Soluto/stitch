import * as path from 'path';
import { Storage } from '../storage';
import { getWasmPolicy } from '../directives/policy/opa';
import { minutesAgo } from '../../../tests/helpers/utility';
import { mockLoadedPolicy } from '../../../tests/helpers/opa-utility';
import { ResourceRepository } from '.';

let repo: ResourceRepository;
let storage: Storage;
const resourceFilePath = '/var/stitch/resources.json';
const policyAttachmentsFolderPath = '/var/stitch/policy-attachments';

jest.mock('../directives/policy/opa', () => ({
  getWasmPolicy: jest.fn(),
}));

beforeEach(() => {
  storage = new MockStorage();
  repo = new ResourceRepository(storage, resourceFilePath, policyAttachmentsFolderPath);
});

describe('shouldRefreshPolicyAttachment', () => {
  let shouldRefreshPolicyAttachment: Function;

  beforeEach(() => {
    shouldRefreshPolicyAttachment = repo['shouldRefreshPolicyAttachment'].bind(repo);
  });

  it('returns true if the given file does not currently exist in memory', () => {
    repo['policyAttachments'].refreshedAt = new Date();

    const result = shouldRefreshPolicyAttachment({ filePath: 'file', lastModified: minutesAgo(5) });
    expect(result).toBe(true);
  });

  it('returns true if this is the first refresh for this process', () => {
    repo['policyAttachments'].attachments['file'] = mockLoadedPolicy();

    const result = shouldRefreshPolicyAttachment({ filePath: 'file', lastModified: minutesAgo(5) });
    expect(result).toBe(true);
  });

  it('returns true if the attachment was last updated after the last refresh', () => {
    repo['policyAttachments'].attachments['file'] = mockLoadedPolicy();
    repo['policyAttachments'].refreshedAt = minutesAgo(5);

    const result = shouldRefreshPolicyAttachment({ filePath: 'file', lastModified: new Date() });
    expect(result).toBe(true);
  });

  it('returns false if the attachment was last updated before the last refresh', () => {
    repo['policyAttachments'].attachments['file'] = mockLoadedPolicy();
    repo['policyAttachments'].refreshedAt = new Date();

    const result = shouldRefreshPolicyAttachment({ filePath: 'file', lastModified: minutesAgo(5) });
    expect(result).toBe(false);
  });
});

describe('refreshPolicyAttachments', () => {
  let refreshPolicyAttachments: Function;

  beforeEach(() => {
    refreshPolicyAttachments = repo['refreshPolicyAttachments'].bind(repo);
  });

  it('refreshes the local copy of all policy attachments that should be refreshed', async () => {
    const upToDateAttachment = mockLoadedPolicy();
    const needsUpdatingAttachmentOld = mockLoadedPolicy();
    const needsUpdatingAttachmentUpdated = mockLoadedPolicy();
    const newFileAttachment = mockLoadedPolicy();
    const deletedAttachment = mockLoadedPolicy();

    repo['policyAttachments'] = {
      refreshedAt: minutesAgo(5),
      attachments: {
        upToDateFile: upToDateAttachment,
        needsUpdating: needsUpdatingAttachmentOld,
        delete: deletedAttachment,
      },
    };

    const upToDateFilePath = path.resolve(policyAttachmentsFolderPath, 'upToDateFile');
    const needsUpdatingPath = path.resolve(policyAttachmentsFolderPath, 'needsUpdating');
    const newFilePath = path.resolve(policyAttachmentsFolderPath, 'newFile');

    const listFilesMock = storage.listFiles as jest.Mock;
    listFilesMock.mockReturnValue(
      Promise.resolve([
        { filePath: upToDateFilePath, lastModified: minutesAgo(10) },
        { filePath: needsUpdatingPath, lastModified: minutesAgo(2) },
        { filePath: newFilePath, lastModified: minutesAgo(3) },
      ])
    );

    const readFileParamBasedReturnValues = {
      [needsUpdatingPath]: Buffer.from('needs updating - updated'),
      [newFilePath]: Buffer.from('new file'),
    };
    const readFileMock = storage.readFile as jest.Mock;
    readFileMock.mockImplementation(filePath => Promise.resolve({ content: readFileParamBasedReturnValues[filePath] }));

    const getWasmPolicyParamBasedReturnValues: any = {
      'needs updating - updated': needsUpdatingAttachmentUpdated,
      'new file': newFileAttachment,
    };
    const getWasmPolicyMock = getWasmPolicy as jest.Mock;
    getWasmPolicyMock.mockImplementation((buffer: Buffer) => {
      return Promise.resolve(getWasmPolicyParamBasedReturnValues[buffer.toString()]);
    });

    await refreshPolicyAttachments();

    expect(repo['policyAttachments'].attachments).toMatchObject({
      upToDateFile: upToDateAttachment,
      needsUpdating: needsUpdatingAttachmentUpdated,
      newFile: newFileAttachment,
    });
    expect(repo['policyAttachments'].refreshedAt?.getTime()).toBeGreaterThan(minutesAgo(1).getTime());

    expect(listFilesMock).toHaveBeenCalledTimes(1);
    expect(listFilesMock).toHaveBeenCalledWith(policyAttachmentsFolderPath);

    expect(readFileMock).toHaveBeenCalledTimes(2);
    expect(readFileMock).toHaveBeenCalledWith(needsUpdatingPath);
    expect(readFileMock).toHaveBeenCalledWith(newFilePath);

    expect(getWasmPolicyMock).toHaveBeenCalledTimes(2);
    expect(getWasmPolicyMock).toHaveBeenCalledWith(Buffer.from('needs updating - updated'));
    expect(getWasmPolicyMock).toHaveBeenCalledWith(Buffer.from('new file'));
  });
});

const MockStorage = jest.fn(() => ({
  fileStats: jest.fn(),
  writeFile: jest.fn(),
  deleteFile: jest.fn(),
  listFiles: jest.fn(),
  readFile: jest.fn(),
}));
