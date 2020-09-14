import { PolicyDefinition } from '../../resource-repository';
import { sdl as policySdl, PolicyDirective } from './policy';
import { sdl as policiesSdl, PoliciesDirective, resolvers as policyScalarResolvers } from './policies';
import { sdl as policyQuerySdl, PolicyQueryDirective } from './policy-query';
import PolicyExecutor from './policy-executor';
import { Policy, LoadedPolicy } from './types';

export {
  PolicyExecutor,
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
