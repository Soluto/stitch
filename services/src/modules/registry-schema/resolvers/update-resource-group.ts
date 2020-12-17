import pLimit from 'p-limit';
import * as _ from 'lodash';
import logger from '../../logger';
import { createSchemaConfig } from '../../graphql-service';
import { applyResourceGroupUpdates } from '../../resource-repository';
import { validateResourceGroupOrThrow } from '../../validation';
import { transformResourceGroup as applyPluginForResourceGroup } from '../../plugins';
import PolicyAttachmentsGenerator from '../policy-attachments-generator';
import resourceRepository from '../repository';
import { ResourceGroupInput } from '../types';
import { updateRemoteGqlSchemas } from '../../directives/gql';
import { ActiveDirectoryAuth } from '../../upstreams';

const singleton = pLimit(1);

export default async function (updates: ResourceGroupInput, activeDirectoryAuth: ActiveDirectoryAuth, dryRun = false) {
  return singleton(async () => {
    logger.info(`Proceeding ${dryRun ? 'validate' : 'update'} resources request...`);
    const policyAttachments = new PolicyAttachmentsGenerator();

    try {
      const { resourceGroup } = await resourceRepository.fetchLatest();
      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      const newRg = applyResourceGroupUpdates(resourceGroup, updates);
      const registryRg = _.cloneDeep(newRg);

      await updateRemoteGqlSchemas(newRg, activeDirectoryAuth);

      const gatewayRg = await applyPluginForResourceGroup(newRg);
      validateResourceGroupOrThrow(gatewayRg);
      await createSchemaConfig(gatewayRg);

      // Policy definitions generated by plugins will always be re-generated here. This is probably
      // better than reading the previous gateway resource group just for this comparison
      const policiesDiff = _.differenceWith(gatewayRg.policies, existingPolicies, _.isEqual);
      await policyAttachments.generate(policiesDiff);

      if (!dryRun) {
        await policyAttachments.writeToRepo();
        await Promise.all([
          resourceRepository.update(registryRg, { registry: true }),
          resourceRepository.update(gatewayRg),
        ]);
        const summary = Object.fromEntries(
          Object.entries(updates).map(([k, v]) => [k, v ? (Array.isArray(v) ? v.length : 1) : 0])
        );
        logger.info(summary, `Resources were ${dryRun ? 'validated' : 'updated'}`);
      }
    } catch (err) {
      logger.error({ err }, `${dryRun ? 'Validate' : 'Updated'} resources request failed`);
      throw err;
    } finally {
      await policyAttachments.cleanup();
    }

    return { success: true };
  });
}
