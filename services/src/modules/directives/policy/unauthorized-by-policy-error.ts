import { ApolloError } from 'apollo-server-core';
import { ResourceMetadata } from '../../resource-repository';

function buildPoliciesMessage(policies: ResourceMetadata[]) {
  return policies.map(p => `${p.name} (${p.namespace})`).join(', ');
}
export default class UnauthorizedByPolicyError extends ApolloError {
  constructor(arg: ResourceMetadata | UnauthorizedByPolicyError[], type: string, field: string) {
    const message = `Access to ${type}.${field} is unauthorized by`;
    if (Array.isArray(arg)) {
      const policies = arg.map((e: UnauthorizedByPolicyError) => e.policy);
      super(`${message} policies: ${buildPoliciesMessage(policies)}`, 'UNAUTHORIZED_BY_POLICY', { policies: arg });
      Object.defineProperty(this, 'policies', { value: policies });
    } else {
      const policy = arg;
      super(`${message} policy "${policy.name}" in namespace "${policy.namespace}"`, 'UNAUTHORIZED_BY_POLICY', {
        policy,
      });
      Object.defineProperty(this, 'policy', { value: policy });
    }
    Object.defineProperty(this, 'name', { value: 'UnauthorizedByPolicyError' });
  }
}
