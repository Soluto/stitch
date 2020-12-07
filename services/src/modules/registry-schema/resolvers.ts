import { IResolvers } from 'graphql-tools';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import pLimit from 'p-limit';
import * as _ from 'lodash';
import { createSchemaConfig } from '../graphql-service';
import { applyResourceGroupUpdates } from '../resource-repository';
import { validateResourceGroupOrThrow } from '../validation';
import { transformResourceGroup as applyPluginForResourceGroup } from '../plugins';
import PolicyAttachmentsGenerator from './policy-attachments-generator';
import resourceRepository from './repository';
import {
  BasePolicyInput,
  PolicyInput,
  ResourceGroupInput,
  SchemaInput,
  UpstreamClientCredentialsInput,
  UpstreamInput,
} from './types';

async function handleUpdateResourceGroupRequest(updates: ResourceGroupInput, dryRun = false) {
  return singleton(async () => {
    const policyAttachments = new PolicyAttachmentsGenerator();

    try {
      const { resourceGroup } = await resourceRepository.fetchLatest();
      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      const newRg = applyResourceGroupUpdates(resourceGroup, updates);
      const registryRg = _.cloneDeep(newRg);

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
      }
    } finally {
      await policyAttachments.cleanup();
    }

    return { success: true };
  });
}

const singleton = pLimit(1);

const resolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Query: {
    validateResourceGroup: (_, args: { input: Partial<ResourceGroupInput> }) =>
      handleUpdateResourceGroupRequest(args.input, true),

    validateSchemas: (_, args: { input: SchemaInput[] }) =>
      handleUpdateResourceGroupRequest({ schemas: args.input }, true),

    validateUpstreams: (_, args: { input: UpstreamInput[] }) =>
      handleUpdateResourceGroupRequest({ upstreams: args.input }, true),

    validateUpstreamClientCredentials: (_, args: { input: UpstreamClientCredentialsInput[] }) =>
      handleUpdateResourceGroupRequest({ upstreamClientCredentials: args.input }, true),

    validatePolicies: (_, args: { input: PolicyInput[] }) =>
      handleUpdateResourceGroupRequest({ policies: args.input }, true),

    validateBasePolicy: (_, args: { input: BasePolicyInput }) =>
      handleUpdateResourceGroupRequest({ basePolicy: args.input }, true),
  },
  Mutation: {
    updateResourceGroup: (_, args: { input: Partial<ResourceGroupInput> }) =>
      handleUpdateResourceGroupRequest(args.input),

    updateSchemas: (_, args: { input: SchemaInput[] }) => handleUpdateResourceGroupRequest({ schemas: args.input }),

    updateUpstreams: (_, args: { input: UpstreamInput[] }) =>
      handleUpdateResourceGroupRequest({ upstreams: args.input }),

    updateUpstreamClientCredentials: (_, args: { input: UpstreamClientCredentialsInput[] }) =>
      handleUpdateResourceGroupRequest({ upstreamClientCredentials: args.input }),

    updatePolicies: (_, args: { input: PolicyInput[] }) => handleUpdateResourceGroupRequest({ policies: args.input }),

    updateBasePolicy: (_, args: { input: BasePolicyInput }) =>
      handleUpdateResourceGroupRequest({ basePolicy: args.input }),
  },
};

export default resolvers;
