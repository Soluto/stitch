import { PolicyDefinition } from '../../resource-repository';
import { sdl as policySdl, PolicyDirective } from './policy';
import { sdl as policyQuerySdl, PolicyQueryDirective } from './policy-query';
import PolicyExecutor from './policy-executor';
import { Policy, LoadedPolicy } from './types';

export { PolicyExecutor, policySdl, policyQuerySdl, PolicyDirective, PolicyQueryDirective };

export type AuthorizationConfig = {
  policies: PolicyDefinition[];
  policyAttachments?: Record<string, LoadedPolicy>;
  policyExecutor: PolicyExecutor;
  basePolicy?: Policy;
};
