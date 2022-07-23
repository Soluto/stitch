import { ApolloServerBase, gql } from 'apollo-server-core';
import { print } from 'graphql';
import { Schema, ResourceGroup } from '../../../src/modules/resource-repository';
import { PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository/types';
import createStitchGateway from '../../../src/modules/apollo-server';
import { PolicyExecutor } from '../../../src/modules/directives/policy';
import { beforeEachDispose } from '../before-each-dispose';
import { getCompiledFilename } from '../../../src/modules/opa-helper';
import { mockLoadedPolicy } from '../../helpers/opa-utility';

jest.mock('../../../src/modules/directives/policy/opa', () => ({
  evaluate: jest.fn(() => ({ done: true, allow: true })),
}));

jest.mock('../../../src/modules/resource-repository/get-resource-repository');
import getResourceRepository from '../../../src/modules/resource-repository/get-resource-repository';

const userSchema: Schema = {
  metadata: { namespace: 'ns', name: 'user' },
  schema: print(gql`
    type User {
      id: ID!
      firstName: String! @policy(namespace: "ns", name: "onlyAdmin", args: { userId: "{source.id}" })
      middleName: String! @policy(namespace: "ns", name: "onlyAdmin", args: { userId: "{source.id}" })
      lastName: String! @policy(namespace: "ns", name: "onlyAdmin", args: { userId: "{source.id}" })
    }

    type Query {
      user: User! @localResolver(value: { id: "42", firstName: "John", middleName: "Hope", lastName: "Smith" })
    }
  `),
};

const userRolesSchema: Schema = {
  metadata: { namespace: 'ns', name: 'userRoles' },
  schema: print(gql`
    type UserRole {
      id: ID!
      role: String!
    }

    type Query {
      userRole(userId: ID!): UserRole! @localResolver(value: { id: "42", role: "admin" })
    }
  `),
};

const policy: PolicyDefinition = {
  metadata: { namespace: 'ns', name: 'onlyAdmin' },
  type: PolicyType.opa,
  code: `legit rego code`,
  args: {
    userId: { type: 'String' },
  },
  query: {
    gql: print(gql`
      query($userId: ID!) {
        userRole(userId: $userId) {
          role
        }
      }
    `),
    variables: {
      userId: '{userId}',
    },
  },
};

const resourceGroup: ResourceGroup = {
  schemas: [userSchema, userRolesSchema],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [policy],
  policyAttachments: {
    [getCompiledFilename(policy.metadata)]: mockLoadedPolicy(true),
  },
};

(getResourceRepository as jest.Mock).mockImplementationOnce(
  jest.fn().mockReturnValueOnce({
    fetchLatest: () => Promise.resolve({ resourceGroup, isNew: true }),
  })
);

describe('Policy Caching', () => {
  let _evaluatePolicySpy: jest.SpyInstance;
  let server: ApolloServerBase;

  beforeEachDispose(async () => {
    _evaluatePolicySpy = jest.spyOn(PolicyExecutor.prototype as any, '_evaluatePolicy');

    ({ server } = await createStitchGateway());
    return () => {
      jest.restoreAllMocks();
      return server.stop();
    };
  });

  it('Evaluates a Policy with identical args only once per request', async () => {
    const response = await server.executeOperation({
      query: gql`
        query {
          user {
            id
            firstName
            middleName
            lastName
          }
        }
      `,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({ user: { id: '42', firstName: 'John', middleName: 'Hope', lastName: 'Smith' } });
    expect(_evaluatePolicySpy).toHaveBeenCalledTimes(1);
  });
});
