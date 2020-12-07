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
