import { gql } from 'apollo-server-core';

export default gql`
  scalar JSON
  scalar JSONObject

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

  type Query {
    validateResourceGroup(input: ResourceGroupInput!): Result
    validateSchemas(input: [SchemaInput!]!): Result
    validateUpstreams(input: [UpstreamInput!]!): Result
    validateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    validatePolicies(input: [PolicyInput!]!): Result
    validateBasePolicy(input: BasePolicyInput!): Result
  }

  type Mutation {
    updateResourceGroup(input: ResourceGroupInput!): Result
    updateSchemas(input: [SchemaInput!]!): Result
    updateUpstreams(input: [UpstreamInput!]!): Result
    updateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    updatePolicies(input: [PolicyInput!]!): Result
    updateBasePolicy(input: BasePolicyInput!): Result
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

  input UpstreamInput {
    metadata: ResourceMetadataInput!
    host: String!
    auth: AuthInput!
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
