import * as path from 'path';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import * as childProcess from 'child_process';
import { ApolloError } from 'apollo-server-fastify';
import { GraphQLError } from 'graphql';
import { ResourceMetadata } from './resource-repository/types';
import logger, { createChildLogger } from './logger';
import * as config from './config';
const exec = promisify(childProcess.exec);

const OPA_PACKAGE_NAME = 'policy';

export async function initializeForRegistry() {
  await fs.mkdir(config.tmpPoliciesDir, { recursive: true });
}

export const getOpaBuildWasmCommand = (uncompiledPath: string, compiledPath: string) => `
  opa build -t wasm -e policy/allow ${uncompiledPath} && \\
  tar -xzf ./bundle.tar.gz /policy.wasm && \\
  mv ./policy.wasm ${compiledPath} && \\
  rm -f ./bundle.tar.gz
`;

export async function prepareCompiledRegoFile(resourceMetadata: ResourceMetadata, inputRegoCode: string) {
  const regoCode = normalizeRegoCodePackage(inputRegoCode);
  const { uncompiledPath, compiledPath } = getTmpFilePaths(resourceMetadata);
  await fs.writeFile(uncompiledPath, regoCode);

  const compileCommand = getOpaBuildWasmCommand(uncompiledPath, compiledPath);
  const regoLogger = createChildLogger(logger, 'opa-rego-compiler', { policy: resourceMetadata });
  try {
    await exec(compileCommand);
    await fs.stat(compiledPath);
    regoLogger.debug('Rego compilation succeeded');
  } catch (err) {
    regoLogger.warn(
      { err, cmd: err.cmd, stdout: err.stdout },
      'Rego compilation failed (normally means invalid user input)'
    );

    const errors = [new GraphQLError(err.stdout)];
    throw new ApolloError('Rego compilation failed', 'REGO_COMPILATION_FAILURE', { errors });
  } finally {
    try {
      await deleteLocalRegoFile(uncompiledPath);
    } catch (err) {
      regoLogger.warn({ err }, 'Failed cleanup of uncompiled rego file, this did not affect the request outcome');
    }
  }

  return compiledPath;
}

// The rego code must start by defining a package name, and we must use this name
// for the query at compile time.
// Since this is an internal name that has no effect on the user, we will always
// set it to the same value for simplicity.
export function normalizeRegoCodePackage(regoCode: string) {
  const regoLines = regoCode.trimStart().split('\n');
  if (regoLines[0].startsWith('package')) regoCode = regoLines.slice(1).join('\n');

  return `package ${OPA_PACKAGE_NAME}\n${regoCode}`;
}

export async function deleteLocalRegoFile(path: string) {
  return fs.unlink(path);
}

export async function readLocalRegoFile(path: string) {
  return fs.readFile(path);
}

export function getTmpFilePaths(resourceMetadata: ResourceMetadata) {
  const uncompiledFilename = getUncompiledFilename(resourceMetadata);
  const compiledFilename = getCompiledFilename(resourceMetadata);

  const uncompiledPath = path.resolve(config.tmpPoliciesDir, uncompiledFilename);
  const compiledPath = path.resolve(config.tmpPoliciesDir, compiledFilename);
  return { uncompiledPath, compiledPath };
}

function getBaseFilename({ name, namespace }: ResourceMetadata) {
  return `${namespace}-${name}`;
}

function getUncompiledFilename(resourceMetadata: ResourceMetadata) {
  return `${getBaseFilename(resourceMetadata)}.rego`;
}

export function getCompiledFilename(resourceMetadata: ResourceMetadata) {
  return `${getBaseFilename(resourceMetadata)}.wasm`;
}
