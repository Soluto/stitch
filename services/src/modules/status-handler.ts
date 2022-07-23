import * as path from 'path';
import { FastifyRequest, FastifyReply } from 'fastify';
import logger, { createChildLogger } from './logger';
import getResourceRepository from './registry-schema/repository';
import { IResourceRepository, ResourceMetadata, PolicyType } from './resource-repository';
import { getCompiledFilename } from './opa-helper';

const sLogger = createChildLogger(logger, 'status-endpoint');

export default async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    const isRegistry = (request?.query as Record<string, unknown>)?.registry === 'true';
    const repository = getResourceRepository(isRegistry);

    const [metadata, missingOpaPolicyAttachments] = await Promise.all([
      repository.fetchMetadata(),
      getMissingOpaPolicyAttachmentNames(repository),
    ]);

    const result = { metadata, missingOpaPolicyAttachments };
    await reply.status(200).send(result);
  } catch (err) {
    sLogger.error(err as Error, 'Error getting data for status endpoint');
    await reply.status(500).send((err as Error).message);
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
