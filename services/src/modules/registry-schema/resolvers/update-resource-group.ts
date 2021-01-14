import pLimit from 'p-limit';
import * as _ from 'lodash';
import logger from '../../logger';
import { createSchemaConfig } from '../../graphql-service';
import { applyResourceGroupUpdates } from '../../resource-repository';
import { validateResourceGroupOrThrow } from '../validation';
import { transformResourceGroup as applyPluginForResourceGroup } from '../../plugins';
import { PolicyAttachmentsHelper, markOptionalPolicyArgs } from '../helpers';
import resourceRepository from '../repository';
import { ResourceGroupInput } from '../types';
import { updateRemoteGqlSchemas } from '../../directives/gql';
import { RegistryRequestContext } from '..';

const singleton = pLimit(1);

export default async function (updates: ResourceGroupInput, context: RegistryRequestContext, dryRun = false) {
  return singleton(async () => {
    logger.info(`Proceeding ${dryRun ? 'validate' : 'update'} resources request...`);
    const policyAttachments = new PolicyAttachmentsHelper();

    try {
      const { resourceGroup } = await resourceRepository.fetchLatest();
      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      const newRg = applyResourceGroupUpdates(resourceGroup, updates);

      // TODO: In case of upstream deletion we should force refresh of remote schemas
      await updateRemoteGqlSchemas(newRg, context);

      const registryRg = _.cloneDeep(newRg);

      const gatewayRg = await applyPluginForResourceGroup(newRg);
      validateResourceGroupOrThrow(gatewayRg);
      await createSchemaConfig(gatewayRg);

      markOptionalPolicyArgs(updates.policies);
      await policyAttachments.sync(existingPolicies, gatewayRg.policies);

      if (!dryRun) {
        await policyAttachments.writeToRepo();
        await Promise.all([
          resourceRepository.update(registryRg, { registry: true }),
          resourceRepository.update(gatewayRg),
        ]);
      }

      const summary = Object.fromEntries(
        Object.entries(updates).map(([k, v]) => [k, v ? (Array.isArray(v) ? v.length : 1) : 0])
      );
      logger.info(summary, `Resources were ${dryRun ? 'validated' : 'updated'}`);
    } catch (err) {
      const message = `${dryRun ? 'Validate' : 'Updated'} resources request failed: ${err}`;
      logger.error({ err }, message);
      throw err;
    } finally {
      await policyAttachments.cleanup();
    }

    return { success: true };
  });
}
