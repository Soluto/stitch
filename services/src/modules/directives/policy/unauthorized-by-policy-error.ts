import { ApolloError } from 'apollo-server-core';
import { ResourceMetadata } from '../../resource-repository';

export default class UnauthorizedByPolicyError extends ApolloError {
  constructor(policy: ResourceMetadata) {
    super(`Unauthorized by policy ${policy.name} in namespace ${policy.namespace}`, 'UNAUTHORIZED_BY_POLICY');

    Object.defineProperty(this, 'name', { value: 'UnauthorizedByPolicyError' });
  }
}
