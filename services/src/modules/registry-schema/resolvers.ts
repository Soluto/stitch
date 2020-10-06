import { IResolvers } from 'graphql-tools';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import pLimit from 'p-limit';
import * as _ from 'lodash';
import { createSchemaConfig } from '../graphql-service';
import { applyResourceGroupUpdates, ResourceGroup } from '../resource-repository';
import { validateResourceGroupOrThrow } from '../validation';
import {
  transformResourcesUpdates as applyPluginForUpdates,
  transformResourceGroup as applyPluginForWholeResourceGroup,
} from '../plugins';
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

async function fetchAndValidate(
  updates: Partial<ResourceGroup>,
  policyAttachments: PolicyAttachmentsGenerator
): Promise<ResourceGroup> {
  const updatesWithPlugins = await applyPluginForUpdates(updates);
  const { resourceGroup } = await resourceRepository.fetchLatest();
  const newRg = applyResourceGroupUpdates(resourceGroup, updatesWithPlugins);
  const newRgWithPlugins = await applyPluginForWholeResourceGroup(newRg);
  validateResourceGroupOrThrow(newRgWithPlugins);
  createSchemaConfig(newRgWithPlugins);

  const policiesDiff = _.differenceWith(newRgWithPlugins.policies, resourceGroup.policies, _.isEqual);
  await policyAttachments.generate(policiesDiff);

  return newRgWithPlugins;
}

async function validateResourceGroup(_: unknown, args: { input: ResourceGroupInput }) {
  const policyAttachments = new PolicyAttachmentsGenerator();

  try {
    await fetchAndValidate(args.input, policyAttachments);
  } finally {
    await policyAttachments.cleanup();
  }

  return { success: true };
}

async function updateResourceGroup(_: unknown, args: { input: ResourceGroupInput }) {
  return singleton(async () => {
    const policyAttachments = new PolicyAttachmentsGenerator();

    try {
      const rg = await fetchAndValidate(args.input, policyAttachments);
      await policyAttachments.writeToRepo();
      await resourceRepository.update(rg);
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
    validateResourceGroup,

    validateSchemas: (_, args: { input: SchemaInput[] }) =>
      validateResourceGroup(_, { input: { schemas: args.input } }),

    validateUpstreams: (_, args: { input: UpstreamInput[] }) =>
      validateResourceGroup(_, { input: { upstreams: args.input } }),

    validateUpstreamClientCredentials: (_, args: { input: UpstreamClientCredentialsInput[] }) =>
      validateResourceGroup(_, { input: { upstreamClientCredentials: args.input } }),

    validatePolicies: (_, args: { input: PolicyInput[] }) =>
      validateResourceGroup(_, { input: { policies: args.input } }),

    validateBasePolicy: (_, args: { input: BasePolicyInput }) =>
      validateResourceGroup(_, { input: { basePolicy: args.input } }),
  },
  Mutation: {
    updateResourceGroup,
    updateSchemas: (_, args: { input: SchemaInput[] }) => updateResourceGroup(_, { input: { schemas: args.input } }),

    updateUpstreams: (_, args: { input: UpstreamInput[] }) =>
      updateResourceGroup(_, { input: { upstreams: args.input } }),

    updateUpstreamClientCredentials: (_, args: { input: UpstreamClientCredentialsInput[] }) =>
      updateResourceGroup(_, { input: { upstreamClientCredentials: args.input } }),

    updatePolicies: (_, args: { input: PolicyInput[] }) => updateResourceGroup(_, { input: { policies: args.input } }),

    updateBasePolicy: (_, args: { input: BasePolicyInput }) =>
      updateResourceGroup(_, { input: { basePolicy: args.input } }),
  },
};

export default resolvers;
