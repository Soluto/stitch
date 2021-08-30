import * as path from 'path';
import { ServerResponse } from 'http';
import { FastifyRequest, FastifyReply } from 'fastify';
import logger, { createChildLogger } from './logger';
import getResourceRepository from './registry-schema/repository';
import { IResourceRepository, ResourceMetadata, PolicyType } from './resource-repository';
import { getCompiledFilename } from './opa-helper';

const sLogger = createChildLogger(logger, 'status-endpoint');

export default async function (request: FastifyRequest, reply: FastifyReply<ServerResponse>) {
  try {
    const isRegistry = request?.query?.registry === 'true';
    const repository = getResourceRepository(isRegistry);

    const [metadata, missingOpaPolicyAttachments] = await Promise.all([
      repository.fetchMetadata(),
      getMissingOpaPolicyAttachmentNames(repository),
    ]);

    const result = { metadata, missingOpaPolicyAttachments };
    reply.status(200).send(result);
  } catch (err) {
    sLogger.error(err, 'Error getting data for status endpoint');
    reply.status(500).send(err?.message);
  }
}

async function getMissingOpaPolicyAttachmentNames(repository: IResourceRepository): Promise<ResourceMetadata[]> {
  const [policyAttachmentsFilenames, policyNames] = await Promise.all([
    getOpaPolicyAttachmentsFilenames(repository),
    getOpaPolicyNames(repository),
  ]);

  return policyNames.filter(policyName => !policyAttachmentsFilenames.has(getCompiledFilename(policyName)));
}

async function getOpaPolicyAttachmentsFilenames(repository: IResourceRepository): Promise<Map<string, unknown>> {
  const attachments = await repository.listPolicyAttachments();

  return attachments.reduce(
    (map, { filePath }) => map.set(path.basename(filePath), undefined),
    new Map<string, unknown>()
  );
}

async function getOpaPolicyNames(repository: IResourceRepository): Promise<ResourceMetadata[]> {
  const rgResult = await repository.fetchLatest();

  return rgResult.resourceGroup.policies
    .filter(policy => policy.type === PolicyType.opa)
    .map(policy => policy.metadata);
}
