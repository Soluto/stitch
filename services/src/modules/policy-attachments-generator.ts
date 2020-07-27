import { ResourceMetadataInput, PolicyInput } from '../registry';
import * as opaHelper from './opa-helper';
import logger from './logger';
import { PolicyType, ResourceRepository } from './resource-repository';

type TempLocalPolicyAttachment = { metadata: ResourceMetadataInput; path: string; type: PolicyType };

export default class PolicyAttachmentsGenerator {
  protected policyAttachments: TempLocalPolicyAttachment[] = [];

  constructor(protected resourceRepository: ResourceRepository) {}

  async generate(policies: PolicyInput[]) {
    for (const policy of policies) {
      if (!policyAttachmentStrategies[policy.type]) continue;

      const attachment = await policyAttachmentStrategies[policy.type].generate(policy);
      this.policyAttachments.push(attachment);
    }
  }

  async writeToRepo() {
    for (const attachment of this.policyAttachments) {
      await policyAttachmentStrategies[attachment.type].writeToRepo(this.resourceRepository, attachment);
    }
  }

  async cleanup() {
    for (const attachment of this.policyAttachments) {
      await policyAttachmentStrategies[attachment.type].cleanup(attachment);
    }
  }
}

const policyAttachmentStrategies = {
  [PolicyType.opa]: {
    generate: async (input: PolicyInput) => {
      const path = await opaHelper.prepareCompiledRegoFile(input.metadata, input.code);
      return { path, metadata: input.metadata, type: PolicyType.opa };
    },
    cleanup: async (attachment: TempLocalPolicyAttachment) => {
      try {
        await opaHelper.deleteLocalRegoFile(attachment.path);
      } catch (err) {
        logger.warn(
          { err, attachment },
          'Failed cleanup of compiled rego file, this did not affect the request outcome'
        );
      }
    },
    writeToRepo: async (resourceRepository: ResourceRepository, attachment: TempLocalPolicyAttachment) => {
      const compiledRego = await opaHelper.readLocalRegoFile(attachment.path);
      const filename = opaHelper.getCompiledFilename(attachment.metadata);
      await resourceRepository.writePolicyAttachment(filename, compiledRego);
    },
  },
};
