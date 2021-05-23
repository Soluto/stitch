import { ApolloError } from 'apollo-server-core';
import { ResourceMetadata } from '../../resource-repository';

export default class PolicyExecutionFailedError extends ApolloError {
  constructor(policy: ResourceMetadata, reason: string, type: string, field: string) {
    super(
      `Policy "${policy.name}" in namespace "${policy.namespace}" on ${type}.${field} execution failed: ${reason}`,
      'POLICY_EXECUTION_FAILED',
      { policy, reason }
    );
    Object.defineProperty(this, 'policy', { value: policy });
    Object.defineProperty(this, 'reason', { value: reason });
    Object.defineProperty(this, 'name', { value: 'PolicyExecutionFailedError' });
  }
}
