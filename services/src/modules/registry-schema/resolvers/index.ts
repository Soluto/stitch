import { IResolvers } from 'graphql-tools';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import {
  BasePolicyInput,
  IntrospectionQueryPolicyInput,
  DefaultUpstreamInput,
  PolicyInput,
  ResourceGroupInput,
  ResourceGroupMetadataInput,
  ResourceMetadataInput,
  ResourceType,
  SchemaInput,
  UpstreamClientCredentialsInput,
  UpstreamInput,
} from '../types';
import { ResourceMetadata } from '../../resource-repository';
import { getPlugins } from '../../plugins';
import rebuildResourceGroup from './rebuild-resource-group';
import handleUpdateResourceGroupRequest from './update-resource-group';
import handleDeleteResourcesRequest from './delete-resources';
import { getRemoteSchema, getRemoteSchemas, getResource, getResourcesByType } from './get-resources';
import refreshRemoteSchema from './refresh-remote-schema';

const resolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Query: {
    plugins: () => getPlugins(),
    schema: (_, args: { metadata: ResourceMetadata; fromGatewayResources?: boolean }) =>
      getResource(ResourceType.Schema, args.metadata, args.fromGatewayResources),

    schemas: (_, args: { fromGatewayResources?: boolean }) =>
      getResourcesByType(ResourceType.Schema, args.fromGatewayResources),

    upstream: (_, args: { metadata: ResourceMetadata; fromGatewayResources?: boolean }) =>
      getResource(ResourceType.Upstream, args.metadata, args.fromGatewayResources),

    upstreams: (_, args: { fromGatewayResources?: boolean }) =>
      getResourcesByType(ResourceType.Upstream, args.fromGatewayResources),

    defaultUpstream: (_, args: { fromGatewayResources?: boolean }) =>
      getResourcesByType(ResourceType.DefaultUpstream, args.fromGatewayResources),

    policy: (_, args: { metadata: ResourceMetadata; fromGatewayResources?: boolean }) =>
      getResource(ResourceType.Policy, args.metadata, args.fromGatewayResources),

    policies: (_, args: { fromGatewayResources?: boolean }) =>
      getResourcesByType(ResourceType.Policy, args.fromGatewayResources),

    basePolicy: (_, args: { fromGatewayResources?: boolean }) =>
      getResourcesByType(ResourceType.BasePolicy, args.fromGatewayResources),

    introspectionQueryPolicy: (_, args: { fromGatewayResources?: boolean }) =>
      getResourcesByType(ResourceType.IntrospectionQueryPolicy, args.fromGatewayResources),

    remoteSchemas: getRemoteSchemas,
    remoteSchema: (_, args: { url: string }) => getRemoteSchema(args.url),

    validateResourceGroup: (_, args: { input: Partial<ResourceGroupInput> }, context) =>
      handleUpdateResourceGroupRequest(args.input, context, true),

    validateSchemas: (_, args: { input: SchemaInput[] }, context) =>
      handleUpdateResourceGroupRequest({ schemas: args.input }, context, true),

    validateUpstreams: (_, args: { input: UpstreamInput[] }, context) =>
      handleUpdateResourceGroupRequest({ upstreams: args.input }, context, true),

    validateUpstreamClientCredentials: (_, args: { input: UpstreamClientCredentialsInput[] }, context) =>
      handleUpdateResourceGroupRequest({ upstreamClientCredentials: args.input }, context, true),

    validatePolicies: (_, args: { input: PolicyInput[] }, context) =>
      handleUpdateResourceGroupRequest({ policies: args.input }, context, true),

    validateBasePolicy: (_, args: { input: BasePolicyInput }, context) =>
      handleUpdateResourceGroupRequest({ basePolicy: args.input }, context, true),

    validateIntrospectionQueryPolicy: (_, args: { input: IntrospectionQueryPolicyInput }, context) =>
      handleUpdateResourceGroupRequest({ introspectionQueryPolicy: args.input }, context, true),

    validateDefaultUpstream: (_, args: { input: DefaultUpstreamInput }, context) =>
      handleUpdateResourceGroupRequest({ defaultUpstream: args.input }, context, true),
  },
  Mutation: {
    rebuildResourceGroup: (_, args: { dryRun: boolean }, context) => rebuildResourceGroup(context, args.dryRun),

    // Update
    updateResourceGroup: (_, args: { input: Partial<ResourceGroupInput> }, context) =>
      handleUpdateResourceGroupRequest(args.input, context),

    updateSchemas: (_, args: { input: SchemaInput[] }, context) =>
      handleUpdateResourceGroupRequest({ schemas: args.input }, context),

    updateUpstreams: (_, args: { input: UpstreamInput[] }, context) =>
      handleUpdateResourceGroupRequest({ upstreams: args.input }, context),

    updateUpstreamClientCredentials: (_, args: { input: UpstreamClientCredentialsInput[] }, context) =>
      handleUpdateResourceGroupRequest({ upstreamClientCredentials: args.input }, context),

    updatePolicies: (_, args: { input: PolicyInput[] }, context) =>
      handleUpdateResourceGroupRequest({ policies: args.input }, context),

    updateBasePolicy: (_, args: { input: BasePolicyInput }, context) =>
      handleUpdateResourceGroupRequest({ basePolicy: args.input }, context),

    updateIntrospectionQueryPolicy: (_, args: { input: IntrospectionQueryPolicyInput }, context) =>
      handleUpdateResourceGroupRequest({ introspectionQueryPolicy: args.input }, context),

    setDefaultUpstream: (_, args: { input: DefaultUpstreamInput }, context) =>
      handleUpdateResourceGroupRequest({ defaultUpstream: args.input }, context),

    // Deletion
    deleteResources: (_, args: { input: Partial<ResourceGroupMetadataInput> }, context) =>
      handleDeleteResourcesRequest(args.input, context),

    deleteSchemas: (_, args: { input: ResourceMetadataInput[] }, context) =>
      handleDeleteResourcesRequest({ schemas: args.input }, context),

    deleteUpstreams: (_, args: { input: ResourceMetadataInput[] }, context) =>
      handleDeleteResourcesRequest({ upstreams: args.input }, context),

    deleteUpstreamClientCredentials: (_, args: { input: ResourceMetadataInput[] }, context) =>
      handleDeleteResourcesRequest({ upstreamClientCredentials: args.input }, context),

    deletePolicies: (_, args: { input: ResourceMetadataInput[] }, context) =>
      handleDeleteResourcesRequest({ policies: args.input }, context),

    deleteBasePolicy: (_, args: { input: boolean }, context) =>
      handleDeleteResourcesRequest({ basePolicy: args.input }, context),

    deleteIntrospectionQueryPolicy: (_, args: { input: boolean }, context) =>
      handleDeleteResourcesRequest({ introspectionQueryPolicy: args.input }, context),

    resetDefaultUpstream: (_, args: { input: boolean }, context) =>
      handleDeleteResourcesRequest({ defaultUpstream: args.input }, context),

    refreshRemoteSchema: (_, args: { url: string }, context) => refreshRemoteSchema(args.url, context),
  },
};

export default resolvers;
