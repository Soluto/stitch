import { validateResourceGroupOrThrow } from './validation';
import { ResourceGroup, PolicyType } from './resource-repository';

describe('validateNamespaceAndPolicyNames - Validation that namespace and policy names contain only valid gql chars and dashes', () => {
  let rg: ResourceGroup;

  beforeEach(() => {
    rg = {
      schemas: [{ metadata: { namespace: 'some-ns', name: 'special_allowed_here_@@' }, schema: 'schema' }],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [{ metadata: { namespace: 'other-ns', name: 'valid-chars_only' }, type: PolicyType.opa, code: 'code' }],
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
      expect(err.errors?.[0]?.message).toEqual(
        'Invalid characters found in namespace name special_not_allowed_@@, allowed characters are /^[A-Z_a-z-][\\w-]*$/'
      );
    }
  });

  it('throws when policy names contain invalid chars', () => {
    rg.policies[0].metadata.name = 'special_not_allowed_$$';
    expect.assertions(1);

    try {
      validateResourceGroupOrThrow(rg);
    } catch (err) {
      expect(err.errors?.[0]?.message).toEqual(
        'Invalid characters found in policy name special_not_allowed_$$, allowed characters are /^[A-Z_a-z-][\\w-]*$/'
      );
    }
  });
});

describe('validateNamespaceAndPolicyNameConflicts', () => {
  let rg: ResourceGroup;

  beforeEach(() => {
    rg = {
      schemas: [{ metadata: { namespace: 'some-ns', name: 'schema-name' }, schema: 'schema' }],
      upstreams: [],
      upstreamClientCredentials: [],
      policies: [
        { metadata: { namespace: 'some-ns', name: 'policy-1' }, type: PolicyType.opa, code: 'code' },
        { metadata: { namespace: 'some-ns', name: 'policy-2' }, type: PolicyType.opa, code: 'code' },
      ],
    };
  });

  it("doesn't throw when multiple resources have the same namespace name", () => {
    expect(() => validateResourceGroupOrThrow(rg)).not.toThrow();
  });

  it('throws when two namespace names are similar, differing only between underscores and dashes', () => {
    rg.schemas[0].metadata.namespace = 'some_ns';

    try {
      validateResourceGroupOrThrow(rg);
    } catch (err) {
      expect(err.errors?.[0]?.message).toEqual(
        'Namespace name conflict found between some_ns and some-ns, they have to either match exactly or have a difference in non-special characters'
      );
    }
  });

  it('throws when two policy names are similar, differing only between underscores and dashes', () => {
    rg.policies[1].metadata.name = 'policy_1';

    try {
      validateResourceGroupOrThrow(rg);
    } catch (err) {
      expect(err.errors?.[0]?.message).toEqual(
        'Policy name conflict found between policy-1 and policy_1, they have to either match exactly or have a difference in non-special characters'
      );
    }
  });
});
