import pLimit from 'p-limit';
import * as _ from 'lodash';
import { GraphQLError } from 'graphql';
import logger from '../../logger';
import { createSchemaConfig } from '../../graphql-service';
import { applyResourceGroupDeletions } from '../../resource-repository';
import { validateResourceGroupOrThrow } from '../../validation';
import { transformResourceGroup as applyPluginForResourceGroup } from '../../plugins';
import { PolicyAttachmentsHelper } from '../helpers';
import resourceRepository from '../repository';
import { RegistryRequestContext, ResourceGroupMetadataInput } from '..';
import { updateRemoteGqlSchemas } from '../../directives/gql';

const singleton = pLimit(1);

export default async function (deletions: ResourceGroupMetadataInput, context: RegistryRequestContext) {
  return singleton(async () => {
    logger.info(`Proceeding resources deletion request...`);
    const policyAttachments = new PolicyAttachmentsHelper();

    try {
      const { resourceGroup } = await resourceRepository.fetchLatest();
      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      const newRg = applyResourceGroupDeletions(resourceGroup, deletions);

      // TODO: In case of upstream deletion we should force refresh of remote schemas
      updateRemoteGqlSchemas(newRg, context);

      const registryRg = _.cloneDeep(newRg);

      const gatewayRg = await applyPluginForResourceGroup(newRg);
      validateResourceGroupOrThrow(gatewayRg);
      await createSchemaConfig(gatewayRg);

      await policyAttachments.sync(existingPolicies, gatewayRg.policies);

      await policyAttachments.writeToRepo();
      await Promise.all([
        resourceRepository.update(registryRg, { registry: true }),
        resourceRepository.update(gatewayRg),
      ]);

      const summary = Object.fromEntries(
        Object.entries(deletions).map(([k, v]) => [k, v ? (Array.isArray(v) ? v.length : 1) : 0])
      );
      logger.info(summary, `Resources were deleted`);
    } catch (err) {
      const message = `Resources deletion request failed: ${err}`;
      logger.error({ err }, message);
      throw new GraphQLError(message);
    } finally {
      await policyAttachments.cleanup();
    }

    return { success: true };
  });
}
