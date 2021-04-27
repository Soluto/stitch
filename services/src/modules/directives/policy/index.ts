import { gql } from 'apollo-server-core';
import { PolicyDefinition } from '../../resource-repository';
import { sdl as policySdl, PolicyDirective } from './policy';
import { sdl as policiesSdl, PoliciesDirective, resolvers as policyScalarResolvers } from './policies';
import { sdl as policyQuerySdl, PolicyQueryDirective } from './policy-query';
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
  PolicyDirective,
  PoliciesDirective,
  PolicyQueryDirective,
  policyScalarResolvers,
};

export type AuthorizationConfig = {
  policies: PolicyDefinition[];
  policyAttachments?: Record<string, LoadedPolicy>;
  policyExecutor: PolicyExecutor;
  basePolicy?: Policy;
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
