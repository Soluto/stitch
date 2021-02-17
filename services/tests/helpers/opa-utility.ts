import { LoadedPolicy } from '../../src/modules/directives/policy/types';

export function mockLoadedPolicy(allow = false): LoadedPolicy {
  const mockLoadedPolicy = { evaluate: () => [{ result: allow }] };
  return (mockLoadedPolicy as unknown) as LoadedPolicy;
}
