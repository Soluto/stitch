import GraphQLErrorSerializer from '../../tests/utils/graphql-error-serializer';
import { validateResourceGroupOrThrow } from './validation';
import { ResourceGroup, PolicyType } from './resource-repository';

beforeAll(() => {
  expect.addSnapshotSerializer(GraphQLErrorSerializer);
});

describe('validateMetadataCharacters - Validation that namespaces and names contain only valid gql chars and dashes', () => {
  let rg: ResourceGroup;

  beforeEach(() => {
    rg = {
      schemas: [{ metadata: { namespace: 'some-ns', name: 'special_not_allowed_here' }, schema: 'schema' }],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [{ metadata: { namespace: 'other-ns', name: 'valid-chars_only' }, type: PolicyType.opa, code: 'code' }],
      remoteSchemas: [],
    };
  });

  it("doesn't throw when names are valid", () => {
    expect(() => validateResourceGroupOrThrow(rg)).not.toThrow();
  });

  it('throws when namespace names contain invalid chars', () => {
    rg.schemas[0].metadata.namespace = 'special_not_allowed_@@';
    expect.assertions(1);

    try {
      validateResourceGroupOrThrow(rg);
    } catch (err) {
      expect(err).toMatchSnapshot();
    }
  });

  it('throws when resource names contain invalid chars', () => {
    rg.policies[0].metadata.name = 'special_not_allowed_$$';
    expect.assertions(1);

    try {
      validateResourceGroupOrThrow(rg);
    } catch (err) {
      expect(err).toMatchSnapshot();
    }
  });
});

describe('validateMetadataNameConflicts', () => {
  let rg: ResourceGroup;

  beforeEach(() => {
    rg = {
      schemas: [
        { metadata: { namespace: 'some-ns', name: 'schema-name-1' }, schema: 'schema' },
        { metadata: { namespace: 'some-ns', name: 'schema-name-2' }, schema: 'schema' },
      ],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [
        { metadata: { namespace: 'some-ns', name: 'policy-1' }, type: PolicyType.opa, code: 'code' },
        { metadata: { namespace: 'some-ns', name: 'policy-2' }, type: PolicyType.opa, code: 'code' },
      ],
      remoteSchemas: [],
    };
  });

  it("doesn't throw when multiple resources have the same namespace name", () => {
    expect(() => validateResourceGroupOrThrow(rg)).not.toThrow();
  });

  it('throws when two namespace names are similar, differing only between underscores and dashes', () => {
    rg.policies[1].metadata.namespace = 'some_ns';
    expect.assertions(1);

    try {
      validateResourceGroupOrThrow(rg);
    } catch (err) {
      expect(err).toMatchSnapshot();
    }
  });

  it('throws when two resource names from the same namespace and resource type are similar, differing only between underscores and dashes', () => {
    rg.policies[1].metadata.name = 'policy_1';
    expect.assertions(1);

    try {
      validateResourceGroupOrThrow(rg);
    } catch (err) {
      expect(err).toMatchSnapshot();
    }
  });

  it("doesn't throw when two resource names from the same namespace and different resource types are similar, differing only between underscores and dashes", () => {
    rg.schemas[1].metadata.name = 'policy_1';
    expect(() => validateResourceGroupOrThrow(rg)).not.toThrow();
  });

  it("doesn't throw when two resource names from the same resource type and different namespaces are similar, differing only between underscores and dashes", () => {
    rg.policies[1].metadata = { namespace: 'other-ns', name: 'policy_1' };
    expect(() => validateResourceGroupOrThrow(rg)).not.toThrow();
  });
});
