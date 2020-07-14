import { gql } from 'apollo-server-core';
import { print } from 'graphql';

export const createPolicyMutation = print(gql`
  mutation CreatePolicy($policies: [PolicyInput!]!) {
    updatePolicies(input: $policies) {
      success
    }
  }
`);

export const createSchemaMutation = print(gql`
  mutation CreateSchema($schema: SchemaInput!) {
    updateSchemas(input: [$schema]) {
      success
    }
  }
`);

export interface CreatePolicyMutationResponse {
  updatePolicies: {
    success: boolean;
  };
}

export interface UpdateSchemasMutationResponse {
  updateSchemas: {
    success: boolean;
  };
}
