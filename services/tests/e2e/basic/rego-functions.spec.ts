import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { GraphQLClient } from 'graphql-request';
import { PolicyArgsDefinitions, PolicyDefinition, PolicyType } from '../../../src/modules/resource-repository';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { sleep } from '../../helpers/utility';
import { RegistryMutationResponse, updatePoliciesMutation } from '../../helpers/registry-request-builder';
import { getToken } from '../../helpers/get-token';

interface TestCase {
  code: string;
  args?: PolicyArgsDefinitions;
  argsLiteral?: string;
}

const gatewayClient = new GraphQLClient('http://localhost:8080/graphql');
const registryClient = new GraphQLClient('http://localhost:8090/graphql');

const testCases: [string, TestCase][] = [
  [
    'count',
    {
      code: `
        default allow = false
        allow {
          count(input.args.roles) > 0
        }
      `,
      args: {
        roles: {
          type: '[String!]!',
        },
      },
      argsLiteral: '(roles: ["admin"])',
    },
  ],
];

describe('Rego Functions', () => {
  const namespace = 'e2e_rego_functions';

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    const accessToken = await getToken();
    gatewayClient.setHeader('Authorization', `Bearer ${accessToken}`);
  });

  test('Setup policies', async () => {
    const policies: PolicyDefinition[] = testCases.map(([name, { code, args }]) => ({
      metadata: {
        namespace,
        name,
      },
      type: PolicyType.opa,
      code,
      args,
    }));

    const policiesResponse = await registryClient.request<RegistryMutationResponse>(updatePoliciesMutation, {
      policies,
    });
    expect(policiesResponse.result.success).toBeTruthy();

    // Wait for gateway to update
    await sleep(Number(process.env.WAIT_FOR_REFRESH_ON_GATEWAY) | 1500);
  });

  test.each(testCases)('%s', async (name, { argsLiteral = '' }) => {
    const query = print(gql`
      query CheckPolicy {
        policy {
          ${namespace}___${name}${argsLiteral} {
            allow
          }
        }
      }
    `);

    const response = await gatewayClient.request(query);
    expect(response).toMatchSnapshot();
  });
});
