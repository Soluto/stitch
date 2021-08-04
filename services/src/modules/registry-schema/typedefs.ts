import { gql } from 'apollo-server-core';

export default gql`
  scalar JSON
  scalar JSONObject

  # Types

  type PluginMetadata {
    name: String!
    version: String!
  }

  # General types
  type ResourceMetadata {
    namespace: String!
    name: String!
  }

  interface Resource {
    metadata: ResourceMetadata!
  }

  type Schema implements Resource {
    metadata: ResourceMetadata!
    schema: String!
  }

  type Upstream implements Resource {
    metadata: ResourceMetadata!
    host: String
    sourceHosts: [String!]
    targetOrigin: String
    auth: Auth
    headers: [UpstreamHeader!]
  }

  type UpstreamHeader {
    name: String!
    value: String!
  }

  type Auth {
    type: AuthType!
    activeDirectory: ActiveDirectoryAuth!
  }

  type ActiveDirectoryAuth {
    authority: String!
    resource: String!
  }

  type DefaultUpstream {
    targetOrigin: String
    auth: Auth
    headers: [UpstreamHeader!]
  }

  type PolicyQuery {
    gql: String!
    variables: JSONObject
  }

  type Policy implements Resource {
    metadata: ResourceMetadata!
    type: PolicyType!
    shouldOverrideBasePolicy: Boolean
    code: String!
    args: JSONObject
    query: PolicyQuery
  }

  type BasePolicy {
    namespace: String!
    name: String!
    args: JSONObject
  }

  type RemoteSchema {
    url: String!
    schema: String!
  }

  # General Inputs

  input ResourceMetadataInput {
    namespace: String!
    name: String!
  }

  type Result {
    success: Boolean!
  }

  input ResourceGroupInput {
    schemas: [SchemaInput!]
    upstreams: [UpstreamInput!]
    upstreamClientCredentials: [UpstreamClientCredentialsInput!]
    policies: [PolicyInput!]
  }

  input ResourceGroupMetadataInput {
    schemas: [ResourceMetadataInput!]
    upstreams: [ResourceMetadataInput!]
    upstreamClientCredentials: [ResourceMetadataInput!]
    policies: [ResourceMetadataInput!]
  }

  type Query {
    plugins: [PluginMetadata!]!
    schema(metadata: ResourceMetadataInput!, fromGatewayResources: Boolean): Schema
    schemas(fromGatewayResources: Boolean): [Schema!]!
    upstream(metadata: ResourceMetadataInput!, fromGatewayResources: Boolean): Upstream
    upstreams(fromGatewayResources: Boolean): [Upstream!]!
    defaultUpstream(fromGatewayResources: Boolean): DefaultUpstream
    policy(metadata: ResourceMetadataInput!, fromGatewayResources: Boolean): Policy
    policies(fromGatewayResources: Boolean): [Policy!]!
    basePolicy(fromGatewayResources: Boolean): BasePolicy
    introspectionQueryPolicy(fromGatewayResources: Boolean): Policy

    remoteSchemas: [RemoteSchema!]!
    remoteSchema(url: String!): RemoteSchema

    validateResourceGroup(input: ResourceGroupInput!): Result
    validateSchemas(input: [SchemaInput!]!): Result
    validateUpstreams(input: [UpstreamInput!]!): Result
    validateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    validatePolicies(input: [PolicyInput!]!): Result
    validateBasePolicy(input: BasePolicyInput!): Result
    validateIntrospectionQueryPolicy(input: PolicyInput!): Result
    validateDefaultUpstream(input: DefaultUpstreamInput!): Result
  }

  type Mutation {
    rebuildResourceGroup(dryRun: Boolean = false): Result

    updateResourceGroup(input: ResourceGroupInput!): Result
    updateSchemas(input: [SchemaInput!]!): Result
    updateUpstreams(input: [UpstreamInput!]!): Result
    updateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    updatePolicies(input: [PolicyInput!]!): Result
    updateBasePolicy(input: BasePolicyInput!): Result
    updateIntrospectionQueryPolicy(input: PolicyInput!): Result
    setDefaultUpstream(input: DefaultUpstreamInput!): Result

    deleteResources(input: ResourceGroupMetadataInput!): Result
    deleteSchemas(input: [ResourceMetadataInput!]!): Result
    deleteUpstreams(input: [ResourceMetadataInput!]!): Result
    deleteUpstreamClientCredentials(input: [ResourceMetadataInput!]!): Result
    deletePolicies(input: [ResourceMetadataInput!]!): Result
    deleteBasePolicy(input: Boolean!): Result
    deleteIntrospectionQueryPolicy(input: Boolean!): Result
    resetDefaultUpstream(input: Boolean!): Result

    refreshRemoteSchema(url: String!): Result
  }

  # Schemas

  input SchemaInput {
    metadata: ResourceMetadataInput!
    schema: String!
  }

  # Upstreams

  enum AuthType {
    ActiveDirectory
  }

  """
  GraphQL doesn't support unions for input types, otherwise this would be a union of different auth types.
  Instead, the AuthType enum indicates which auth type is needed, and there's a property which corresponds to each auth type, which we validate in the registry.
  """
  input AuthInput {
    type: AuthType!
    activeDirectory: ActiveDirectoryAuthInput!
  }

  input ActiveDirectoryAuthInput {
    authority: String!
    resource: String!
  }

  input UpstreamHeaderInput {
    name: String!
    value: String!
  }

  input UpstreamInput {
    metadata: ResourceMetadataInput!
    host: String
    sourceHosts: [String!]
    targetOrigin: String
    auth: AuthInput
    headers: [UpstreamHeaderInput!]
  }

  input DefaultUpstreamInput {
    targetOrigin: String
    auth: AuthInput
    headers: [UpstreamHeaderInput!]
  }

  # Upstream client credentials

  input ActiveDirectoryCredentials {
    authority: String!
    clientId: String!
    clientSecret: String!
  }

  """
  GraphQL doesn't support unions for input types, otherwise this would be a union of different auth types.
  Instead, the AuthType enum indicates which auth type is needed, and there's a property which corresponds to each auth type, which we validate in the registry.
  """
  input UpstreamClientCredentialsInput {
    metadata: ResourceMetadataInput!
    authType: AuthType!
    activeDirectory: ActiveDirectoryCredentials!
  }

  # Policy

  enum PolicyType {
    opa
  }

  input PolicyQueryInput {
    gql: String!
    variables: JSONObject
  }

  input PolicyInput {
    metadata: ResourceMetadataInput!
    type: PolicyType!
    shouldOverrideBasePolicy: Boolean
    code: String!
    args: JSONObject
    query: PolicyQueryInput
  }

  input BasePolicyInput {
    namespace: String!
    name: String!
    args: JSONObject
  }

  input PolicyInput {
    namespace: String!
    name: String!
    args: JSONObject
  }
`;
