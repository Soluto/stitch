import { gql } from 'apollo-server-core';

export default gql`
  scalar JSON
  scalar JSONObject

  # Types

  type PluginMetadata {
    name: String!
    version: String!
  }

  # General

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

    validateResourceGroup(input: ResourceGroupInput!): Result
    validateSchemas(input: [SchemaInput!]!): Result
    validateUpstreams(input: [UpstreamInput!]!): Result
    validateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    validatePolicies(input: [PolicyInput!]!): Result
    validateBasePolicy(input: BasePolicyInput!): Result
    validateDefaultUpstream(input: DefaultUpstreamInput!): Result
  }

  type Mutation {
    updateResourceGroup(input: ResourceGroupInput!): Result
    updateSchemas(input: [SchemaInput!]!): Result
    updateUpstreams(input: [UpstreamInput!]!): Result
    updateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    updatePolicies(input: [PolicyInput!]!): Result
    updateBasePolicy(input: BasePolicyInput!): Result
    setDefaultUpstream(input: DefaultUpstreamInput!): Result

    deleteResources(input: ResourceGroupMetadataInput!): Result
    deleteSchemas(input: [ResourceMetadataInput!]!): Result
    deleteUpstreams(input: [ResourceMetadataInput!]!): Result
    deleteUpstreamClientCredentials(input: [ResourceMetadataInput!]!): Result
    deletePolicies(input: [ResourceMetadataInput!]!): Result
    deleteBasePolicy(input: Boolean!): Result
    resetDefaultUpstream(input: Boolean!): Result
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

  input UpstreamHeader {
    name: String!
    value: String!
  }

  input UpstreamInput {
    metadata: ResourceMetadataInput!
    host: String
    sourceHosts: [String!]
    targetOrigin: String
    auth: AuthInput
    headers: [UpstreamHeader!]
  }

  input DefaultUpstreamInput {
    targetOrigin: String
    auth: AuthInput
    headers: [UpstreamHeader!]
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
`;
