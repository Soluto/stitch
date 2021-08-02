import { gql } from 'apollo-server-core';
import { print } from 'graphql';

export const updatePoliciesMutation = print(gql`
  mutation UpdatePolicies($policies: [PolicyInput!]!) {
    result: updatePolicies(input: $policies) {
      success
    }
  }
`);

export const updateSchemasMutation = print(gql`
  mutation UpdateSchemas($schema: SchemaInput!) {
    result: updateSchemas(input: [$schema]) {
      success
    }
  }
`);

export const updateBasePolicyMutation = print(gql`
  mutation UpdateBasePolicy($basePolicy: BasePolicyInput!) {
    result: updateBasePolicy(input: $basePolicy) {
      success
    }
  }
`);

export const updateIntrospectionQueryPolicyMutation = print(gql`
  mutation UpdateIntrospectionQueryPolicy($introspectionQueryPolicy: IntrospectionQueryPolicyInput!) {
    result: updateIntrospectionQueryPolicy(input: $introspectionQueryPolicy) {
      success
    }
  }
`);

export const updateResourceGroupMutation = print(gql`
  mutation UpdateResourceGroupMutation($resourceGroup: ResourceGroupInput!) {
    result: updateResourceGroup(input: $resourceGroup) {
      success
    }
  }
`);

export interface RegistryMutationResponse {
  result: {
    success: boolean;
  };
}
