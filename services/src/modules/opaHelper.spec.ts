import { getTmpFilePaths, prepareCompiledRegoFile, normalizeRegoCodePackage } from './opaHelper';
import { mocked } from 'ts-jest/utils';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { tmpPoliciesDir } from './config';
import * as path from 'path';
import mockFsForOpa from '../tests/helpers/mockFsForOpa';

jest.mock('child_process', () => ({
  exec: jest.fn((_, cb) => cb()),
}));

const mockedExec = mocked(exec, true);

const metadata = { namespace: 'ns', name: 'name' };
const uncompiledPath = path.resolve(tmpPoliciesDir, 'ns-name.rego');
const compiledPath = path.resolve(tmpPoliciesDir, 'ns-name.wasm');

describe('getTmpFilePaths', () => {
  it('returns the paths for the compiled and uncompiled rego files based on the resource metadata', () => {
    const tmpFilePaths = getTmpFilePaths(metadata);

    expect(tmpFilePaths).toMatchObject({ compiledPath, uncompiledPath });
  });
});

describe('prepareCompiledRegoFile', () => {
  it('compiles the rego code and returns the path to the compiled wasm file', async () => {
    mockFsForOpa.mock();

    const regoCode = 'package policy\nsome rego code';
    const result = await prepareCompiledRegoFile(metadata, regoCode);

    expect(result).toBe(compiledPath);
    expect(fs.writeFile).toHaveBeenCalledWith(uncompiledPath, regoCode);
    expect(fs.unlink).toHaveBeenCalledWith(uncompiledPath);

    const expectedCommand = `opa build -d ${uncompiledPath} -o ${compiledPath} 'data.policy = result'`;
    expect(mockedExec.mock.calls[0][0]).toBe(expectedCommand);

    mockFsForOpa.restore();
  });
});

describe('normalizeRegoCodePackage', () => {
  const someRegoCode = `some
    rego code
    with multiple lines`;
  const expectedRego = `package policy\n${someRegoCode}`;

  it('adds a package definition if it was missing', () => {
    const result = normalizeRegoCodePackage(someRegoCode);

    expect(result).toBe(expectedRego);
  });

  it('replaces an existing package definition', () => {
    const regoCode = `package othername\n${someRegoCode}`;
    const result = normalizeRegoCodePackage(regoCode);

    expect(result).toBe(expectedRego);
  });

  it('handles leading whitespace', () => {
    const regoCode = `\n  \n package somename\n${someRegoCode}`;
    const result = normalizeRegoCodePackage(regoCode);

    expect(result).toBe(expectedRego);
  });
});
