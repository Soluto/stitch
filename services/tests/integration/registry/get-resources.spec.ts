import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import * as nock from 'nock';
import { AuthType } from '../../../src/modules/registry-schema';
import {
  DefaultUpstream,
  PolicyDefinition,
  PolicyType,
  ResourceGroup,
  Schema,
  Upstream,
} from '../../../src/modules/resource-repository';
import { mockResourceBucket } from '../resource-bucket';
import { app } from '../../../src/registry';
import { Policy } from '../../../src/modules/directives/policy/types';

const schema1: Schema = {
  metadata: { namespace: 'get-resource', name: 'schema1' },
  schema: print(
    gql`
      type Query {
        foo: String!
      }
    `
  ),
};

const schema2: Schema = {
  metadata: { namespace: 'get-resource', name: 'schema2' },
  schema: print(
    gql`
      type Query {
        bar: String!
      }
    `
  ),
};

const upstream1: Upstream = {
  metadata: { namespace: 'get-resource', name: 'upstream1' },
  host: 'test.api',
  auth: {
    type: AuthType.ActiveDirectory,
    activeDirectory: { authority: 'https://authority', resource: 'someResource' },
  },
};

const upstream2: Upstream = {
  metadata: { namespace: 'get-resource', name: 'upstream2' },
  sourceHosts: ['test2.api'],
  headers: [
    {
      name: 'x-api-client',
      value: '{incomingRequest?.headers?.["x-api-client"]}',
    },
  ],
};

const policy1: PolicyDefinition = {
  metadata: { namespace: 'get-resource', name: 'policy1' },
  type: PolicyType.opa,
  code: `real rego code
           with multiple
           lines`,
  args: {
    an: { type: 'String', default: '{source.an}' },
    another: { type: 'String!' },
  },
  query: {
    gql: 'some another gql',
    variables: {
      c: 'd',
    },
  },
};

const policy2: PolicyDefinition = {
  metadata: { namespace: 'get-resource', name: 'policy2' },
  type: PolicyType.opa,
  code: `real rego code
           with multiple
           lines`,
};

const basePolicy: Policy = {
  namespace: 'get-resource',
  name: 'policy1',
  args: {
    another: 'Hey',
  },
};

const defaultUpstream: DefaultUpstream = {
  headers: [
    {
      name: 'foo',
      value: 'bar',
    },
  ],
};

const baseResourceGroup: ResourceGroup = {
  schemas: [schema1, schema2],
  upstreams: [upstream1, upstream2],
  upstreamClientCredentials: [],
  policies: [policy1, policy2],
  defaultUpstream,
  basePolicy,
};

describe('Get resources', () => {
  beforeEach(() => {
    const initialPolicyFiles = { 'namespace-name.wasm': 'old compiled code' };
    mockResourceBucket({ registry: baseResourceGroup, policyFiles: initialPolicyFiles });
  });

  afterEach(() => {
    return () => nock.cleanAll();
  });

  test('schemas', async () => {
    const query = gql`
      query {
        schemas {
          metadata {
            namespace
            name
          }
          schema
        }
      }
    `;
    const { data, errors } = await app.executeOperation({ query });
    expect({ data, errors }).toMatchSnapshot();
  });

  test('schema', async () => {
    const query = gql`
      query($metadata: ResourceMetadataInput!) {
        schema(metadata: $metadata) {
          metadata {
            namespace
            name
          }
          schema
        }
      }
    `;
    const variables = { metadata: { namespace: 'get-resource', name: 'schema1' } };
    const { data, errors } = await app.executeOperation({ query, variables });
    expect({ data, errors }).toMatchSnapshot();
  });

  test('upstreams', async () => {
    const query = gql`
      query {
        upstreams {
          metadata {
            namespace
            name
          }
          host
          sourceHosts
          headers {
            name
          }
        }
      }
    `;
    const { data, errors } = await app.executeOperation({ query });
    expect({ data, errors }).toMatchSnapshot();
  });

  test('upstream', async () => {
    const query = gql`
      query($metadata: ResourceMetadataInput!) {
        upstream(metadata: $metadata) {
          metadata {
            namespace
            name
          }
          headers {
            name
          }
        }
      }
    `;
    const variables = { metadata: { namespace: 'get-resource', name: 'upstream1' } };
    const { data, errors } = await app.executeOperation({ query, variables });
    expect({ data, errors }).toMatchSnapshot();
  });

  test('default upstream', async () => {
    const query = gql`
      query {
        defaultUpstream {
          headers {
            name
          }
          auth {
            type
          }
        }
      }
    `;
    const { data, errors } = await app.executeOperation({ query });
    expect({ data, errors }).toMatchSnapshot();
  });

  test('policies', async () => {
    const query = gql`
      query {
        policies {
          metadata {
            namespace
            name
          }
          code
        }
      }
    `;
    const { data, errors } = await app.executeOperation({ query });
    expect({ data, errors }).toMatchSnapshot();
  });

  test('policy', async () => {
    const query = gql`
      query($metadata: ResourceMetadataInput!) {
        policy(metadata: $metadata) {
          metadata {
            namespace
            name
          }
          code
        }
      }
    `;
    const variables = { metadata: { namespace: 'get-resource', name: 'policy1' } };
    const { data, errors } = await app.executeOperation({ query, variables });
    expect({ data, errors }).toMatchSnapshot();
  });

  test('base policy', async () => {
    const query = gql`
      query {
        basePolicy {
          namespace
          name
          args
        }
      }
    `;
    const { data, errors } = await app.executeOperation({ query });
    expect({ data, errors }).toMatchSnapshot();
  });
});
