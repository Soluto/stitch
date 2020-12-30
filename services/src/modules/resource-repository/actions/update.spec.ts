import { Resource } from '..';
import { applyResourceUpdates } from './update';

describe('applyResourceUpdates', () => {
  it('Inserts new resources', () => {
    const existingResource: Resource = { metadata: { namespace: 'namespace', name: 'name' } };
    const newResource: Resource = { metadata: { namespace: 'namespace2', name: 'name2' } };

    const resources = applyResourceUpdates([existingResource], [newResource]);
    expect(resources).toHaveLength(2);
    expect(resources[0]).toBe(existingResource);
    expect(resources[1]).toBe(newResource);
  });

  it('Replaces existing resource when namespace/name matches', () => {
    const existingResource: Resource = { metadata: { namespace: 'namespace', name: 'name' } };
    const newResource: Resource = { ...existingResource };

    const resources = applyResourceUpdates([existingResource], [newResource]);
    expect(resources).toHaveLength(1);
    expect(resources[0]).toBe(newResource);
  });
});
