import pLimit from 'p-limit';
import * as _ from 'lodash';
import logger from '../../logger';
import { createSchemaConfig } from '../../graphql-service';
import { applyResourceGroupUpdates } from '../../resource-repository';
import { validateResourceGroupOrThrow } from '../validation';
import { transformResourceGroup as applyPluginsForResourceGroup } from '../../plugins';
import { PolicyAttachmentsHelper, markOptionalPolicyArgs } from '../helpers';
import getResourceRepository from '../repository';
import { ResourceGroupInput } from '../types';
import { updateRemoteGqlSchemas } from '../../directives/gql';
import { RegistryRequestContext } from '..';

const singleton = pLimit(1);

export default async function (updates: ResourceGroupInput, context: RegistryRequestContext, dryRun = false) {
  return singleton(async () => {
    logger.info(`Proceeding ${dryRun ? 'validate' : 'update'} resources request...`);
    const policyAttachments = new PolicyAttachmentsHelper();
    const resourceRepository = getResourceRepository();

    try {
      logger.debug('Fetching latest resource group...');
      const { resourceGroup } = await resourceRepository.fetchLatest();
      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      logger.debug('Applying resource group updates...');
      const newRg = applyResourceGroupUpdates(resourceGroup, updates);

      // TODO: In case of upstream deletion we should force refresh of remote schemas
      logger.debug('Updating remote gql schemas...');
      await updateRemoteGqlSchemas(newRg, context);

      const registryRg = _.cloneDeep(newRg);

      logger.debug('Applying plugins for resource group...');
      const gatewayRg = await applyPluginsForResourceGroup(newRg);

      logger.debug('Validating resource group...');
      validateResourceGroupOrThrow(gatewayRg);

      logger.debug('Creating schema config...');
      await createSchemaConfig(gatewayRg);

      logger.debug('Marking optional policy arguments...');
      markOptionalPolicyArgs(updates.policies);

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
      const message = `${dryRun ? 'Validate' : 'Updated'} resources request failed: ${err}`;
      logger.error({ err }, message);
      throw err;
    } finally {
      logger.debug('Removing policy attachments temporary files...');
      await policyAttachments.cleanup();
    }

    const summary = Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [k, v ? (Array.isArray(v) ? v.length : 1) : 0])
    );
    logger.info(summary, `Resources were ${dryRun ? 'validated' : 'updated'}`);
    return { success: true };
  });
}
