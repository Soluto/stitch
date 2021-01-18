import pLimit from 'p-limit';
import * as _ from 'lodash';
import { GraphQLError } from 'graphql';
import logger from '../../logger';
import { createSchemaConfig } from '../../graphql-service';
import { applyResourceGroupDeletions } from '../../resource-repository';
import { validateResourceGroupOrThrow } from '../validation';
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
      logger.trace('Fetching latest resource group...');
      const { resourceGroup } = await resourceRepository.fetchLatest();
      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      logger.trace('Applying resource group updates...');
      const newRg = applyResourceGroupDeletions(resourceGroup, deletions);

      // TODO: In case of upstream deletion we should force refresh of remote schemas
      logger.trace('Updating remote gql schemas...');
      updateRemoteGqlSchemas(newRg, context);

      const registryRg = _.cloneDeep(newRg);

      logger.trace('Applying plugins for resource group...');
      const gatewayRg = await applyPluginForResourceGroup(newRg);

      logger.trace('Validating resource group...');
      validateResourceGroupOrThrow(gatewayRg);

      logger.trace('Creating schema config...');
      await createSchemaConfig(gatewayRg);

      logger.trace('Synchronizing policy attachments...');
      await policyAttachments.sync(existingPolicies, gatewayRg.policies);

      logger.trace('Saving policy attachments...');
      await policyAttachments.writeToRepo();

      logger.trace('Saving resource group...');
      await Promise.all([
        resourceRepository.update(registryRg, { registry: true }),
        resourceRepository.update(gatewayRg),
      ]);
    } catch (err) {
      const message = `Resources deletion request failed: ${err}`;
      logger.error({ err }, message);
      throw new GraphQLError(message);
    } finally {
      logger.trace('Removing policy attachments temporary files...');
      await policyAttachments.cleanup();
    }

    const summary = Object.fromEntries(
      Object.entries(deletions).map(([k, v]) => [k, v ? (Array.isArray(v) ? v.length : 1) : 0])
    );
    logger.info(summary, `Resources were deleted`);

    return { success: true };
  });
}
