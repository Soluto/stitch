import { gql } from 'apollo-server-core';
import { PolicyDefinition } from '../../resource-repository';
import { sdl as policySdl, directiveSchemaTransformer as policyDirectiveSchemaTransformer } from './policy';
import {
  sdl as policiesSdl,
  directiveSchemaTransformer as policiesDirectiveSchemaTransformer,
  resolvers as policyScalarResolvers,
} from './policies';
import {
  sdl as policyQuerySdl,
  directiveSchemaTransformer as policyQueryDirectiveSchemaTransformer,
} from './policy-query';
import PolicyExecutor from './policy-executor';
import { buildPolicyQueryTypeDef } from './policy-query-helper';
import { Policy, LoadedPolicy } from './types';
import UnauthorizedByPolicyError from './unauthorized-by-policy-error';

export {
  buildPolicyQueryTypeDef,
  PolicyExecutor,
  UnauthorizedByPolicyError,
  policySdl,
  policiesSdl,
  policyQuerySdl,
  policyDirectiveSchemaTransformer,
  policiesDirectiveSchemaTransformer,
  policyQueryDirectiveSchemaTransformer,
  policyScalarResolvers,
};

export type AuthorizationConfig = {
  policies: PolicyDefinition[];
  policyAttachments?: Record<string, LoadedPolicy>;
  policyExecutor: PolicyExecutor;
  basePolicy?: Policy;
  introspectionQueryPolicy?: Policy;
};

export const policyBaseSdl = gql`
  type PolicyResult {
    allow: Boolean!
  }

  type Policy {
    default: PolicyResult!
  }
`;

export const policyFieldSdl = gql`
  type Query {
    policy: Policy! @localResolver(value: { default: { allow: true } })
  }
`;
