import * as pLimit from 'p-limit';
import * as _ from 'lodash';
import { RegistryRequestContext } from '..';
import { updateRemoteGqlSchemas } from '../../directives/gql';
import { createGatewaySchema } from '../../apollo-server';
import logger from '../../logger';
import { transformResourceGroup as applyPluginsForResourceGroup } from '../../plugins';
import { markOptionalPolicyArgs, PolicyAttachmentsHelper } from '../helpers';
import getResourceRepository from '../repository';
import { validateResourceGroupOrThrow } from '../validation';

const singleton = pLimit(1);

export default async function (context: RegistryRequestContext, dryRun = false) {
  return singleton(async () => {
    logger.info(`Proceeding ${dryRun ? 'validate' : 'rebuild'} resources request...`);
    const policyAttachments = new PolicyAttachmentsHelper();
    const resourceRepository = getResourceRepository();

    try {
      logger.debug('Fetching latest resource group...');
      const { resourceGroup } = await resourceRepository.fetchLatest();

      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      logger.debug('Updating remote gql schemas...');
      await updateRemoteGqlSchemas(resourceGroup, context);

      const registryRg = _.cloneDeep(resourceGroup);

      logger.debug('Applying plugins for resource group...');
      const gatewayRg = await applyPluginsForResourceGroup(resourceGroup);

      logger.debug('Validating resource group...');
      validateResourceGroupOrThrow(gatewayRg);

      logger.debug('Creating schema...');
      await createGatewaySchema(gatewayRg);

      logger.debug('Marking optional policy arguments...');
      markOptionalPolicyArgs(gatewayRg.policies);

      logger.debug('Synchronizing policy attachments...');
      await policyAttachments.sync(existingPolicies, gatewayRg.policies);

      if (!dryRun) {
        logger.debug('Saving policy attachments...');
        await policyAttachments.writeToRepo();
        logger.debug('Saving resource group...');
        await Promise.all([
          resourceRepository.update(registryRg, { registry: true }),
          resourceRepository.update(gatewayRg),
        ]);
      }
    } catch (err) {
      const message = `${dryRun ? 'Validate' : 'Rebuild'} resources request failed: ${err}`;
      logger.error({ err }, message);
      throw err;
    } finally {
      logger.debug('Removing policy attachments temporary files...');
      await policyAttachments.cleanup();
    }
    logger.info(`All resources were ${dryRun ? 'validated' : 'rebuilt'}`);
    return { success: true };
  });
}
