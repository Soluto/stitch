import { IResolvers } from 'graphql-tools';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import * as _ from 'lodash';
import {
  BasePolicyInput,
  PolicyInput,
  ResourceGroupInput,
  SchemaInput,
  UpstreamClientCredentialsInput,
  UpstreamInput,
} from '../types';
import handleUpdateResourceGroupRequest from './update-resource-group';

const resolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Query: {
    validateResourceGroup: (_, args: { input: Partial<ResourceGroupInput> }, context) =>
      handleUpdateResourceGroupRequest(args.input, context.activeDirectoryAuth, true),

    validateSchemas: (_, args: { input: SchemaInput[] }, context) =>
      handleUpdateResourceGroupRequest({ schemas: args.input }, context.activeDirectoryAuth, true),

    validateUpstreams: (_, args: { input: UpstreamInput[] }, context) =>
      handleUpdateResourceGroupRequest({ upstreams: args.input }, context.activeDirectoryAuth, true),

    validateUpstreamClientCredentials: (_, args: { input: UpstreamClientCredentialsInput[] }, context) =>
      handleUpdateResourceGroupRequest({ upstreamClientCredentials: args.input }, context.activeDirectoryAuth, true),

    validatePolicies: (_, args: { input: PolicyInput[] }, context) =>
      handleUpdateResourceGroupRequest({ policies: args.input }, context.activeDirectoryAuth, true),

    validateBasePolicy: (_, args: { input: BasePolicyInput }, context) =>
      handleUpdateResourceGroupRequest({ basePolicy: args.input }, context.activeDirectoryAuth, true),
  },
  Mutation: {
    updateResourceGroup: (_, args: { input: Partial<ResourceGroupInput> }, context) =>
      handleUpdateResourceGroupRequest(args.input, context.activeDirectoryAuth),

    updateSchemas: (_, args: { input: SchemaInput[] }, context) =>
      handleUpdateResourceGroupRequest({ schemas: args.input }, context.activeDirectoryAuth),

    updateUpstreams: (_, args: { input: UpstreamInput[] }, context) =>
      handleUpdateResourceGroupRequest({ upstreams: args.input }, context.activeDirectoryAuth),

    updateUpstreamClientCredentials: (_, args: { input: UpstreamClientCredentialsInput[] }, context) =>
      handleUpdateResourceGroupRequest({ upstreamClientCredentials: args.input }, context.activeDirectoryAuth),

    updatePolicies: (_, args: { input: PolicyInput[] }, context) =>
      handleUpdateResourceGroupRequest({ policies: args.input }, context.activeDirectoryAuth),

    updateBasePolicy: (_, args: { input: BasePolicyInput }, context) =>
      handleUpdateResourceGroupRequest({ basePolicy: args.input }, context.activeDirectoryAuth),
  },
};

export default resolvers;
