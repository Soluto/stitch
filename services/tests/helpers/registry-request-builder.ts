import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import { Schema } from '../../src/modules/resource-repository';

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

export const createBasePolicyMutation = print(gql`
  mutation UpdateBasePolicy($basePolicy: BasePolicyInput!) {
    updateBasePolicy(input: $basePolicy) {
      success
    }
  }
`);

export const emptySchema = (schema: Schema): Schema => ({
  metadata: schema.metadata,
  schema: '',
});

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

export interface UpdateBasePolicyMutationResponse {
  updateBasePolicy: {
    success: boolean;
  };
}
