import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server-core';
import * as nock from 'nock';
import { print } from 'graphql';
import { beforeEachDispose } from '../before-each-dispose';
import { app } from '../../../src/registry';
import { mockResourceBucket } from '../resource-bucket';
import { ResourceGroup } from '../../../src/modules/resource-repository';

const badSdlSchema = {
  metadata: { namespace: 'namespace', name: 'name' },
  schema: 'type Query { something: String! ',
};

const badDirectiveSchema = {
  metadata: { namespace: 'namespace', name: 'name' },
  schema: 'type Query { something: String! @rest(url: "something", fakeArgument: 123) }',
};

const badFederationSchemas = [
  {
    metadata: { namespace: 'namespace', name: 'basePerson' },
    schema: print(gql`
      type Person @key(fields: "id") {
        id: ID!
      }
    `),
  },
  {
    metadata: { namespace: 'namespace', name: 'personExtension' },
    schema: print(gql`
      extend type Person @key(fields: "name") {
        something: Int!
      }
    `),
  },
];

const baseResourceGroup: ResourceGroup = {
  schemas: [],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [],
};
describe('Creation of invalid schemas', () => {
  let client: ApolloServerTestClient;

  beforeEachDispose(() => {
    client = createTestClient(app);
    mockResourceBucket({ registry: baseResourceGroup });

    return () => nock.cleanAll();
  });

  it('Invalid SDL in schema gets rejected', async () => {
    const response = await client.mutate({
      mutation: gql`
        mutation CreateSchema($schema: SchemaInput!) {
          updateSchemas(input: [$schema]) {
            success
          }
        }
      `,
      variables: {
        schema: badSdlSchema,
      },
    });

    expect(response.errors).toMatchSnapshot();
  });

  it('Invalid directive arguments in schema gets rejected', async () => {
    const response = await client.mutate({
      mutation: gql`
        mutation CreateSchema($schema: SchemaInput!) {
          updateSchemas(input: [$schema]) {
            success
          }
        }
      `,
      variables: {
        schema: badDirectiveSchema,
      },
    });

    expect(response.errors).toMatchSnapshot();
  });

  it('Bad federation composition in schema gets rejected', async () => {
    const response = await client.mutate({
      mutation: gql`
        mutation CreateSchema($schemas: [SchemaInput!]!) {
          updateSchemas(input: $schemas) {
            success
          }
        }
      `,
      variables: {
        schemas: badFederationSchemas,
      },
    });

    expect(response.errors).toMatchSnapshot();
  });
});
