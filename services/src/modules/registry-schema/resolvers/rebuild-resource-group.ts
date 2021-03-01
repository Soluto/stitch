import pLimit from 'p-limit';
import * as _ from 'lodash';
import { RegistryRequestContext } from '..';
import { updateRemoteGqlSchemas } from '../../directives/gql';
import { createSchemaConfig } from '../../graphql-service';
import logger from '../../logger';
import { transformResourceGroup as applyPluginsForResourceGroup } from '../../plugins';
import { PolicyAttachmentsHelper } from '../helpers';
import getResourceRepository from '../repository';
import { validateResourceGroupOrThrow } from '../validation';

const singleton = pLimit(1);

export default async function (context: RegistryRequestContext, dryRun = false) {
  return singleton(async () => {
    logger.info(`Proceeding ${dryRun ? 'validate' : 'rebuild'} resources request...`);
    const policyAttachments = new PolicyAttachmentsHelper();
    const resourceRepository = getResourceRepository();

    try {
      logger.trace('Fetching latest resource group...');
      const { resourceGroup } = await resourceRepository.fetchLatest();

      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      logger.trace('Updating remote gql schemas...');
      await updateRemoteGqlSchemas(resourceGroup, context);

      const registryRg = _.cloneDeep(resourceGroup);

      logger.trace('Applying plugins for resource group...');
      const gatewayRg = await applyPluginsForResourceGroup(resourceGroup);

      logger.trace('Validating resource group...');
      validateResourceGroupOrThrow(gatewayRg);

      logger.trace('Creating schema config...');
      await createSchemaConfig(gatewayRg);

      logger.trace('Synchronizing policy attachments...');
      await policyAttachments.sync(existingPolicies, gatewayRg.policies);

      if (!dryRun) {
        logger.trace('Saving policy attachments...');
        await policyAttachments.writeToRepo();
        logger.trace('Saving resource group...');
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
      logger.trace('Removing policy attachments temporary files...');
      await policyAttachments.cleanup();
    }
    logger.info(`All resources were ${dryRun ? 'validated' : 'rebuilt'}`);
    return { success: true };
  });
}
