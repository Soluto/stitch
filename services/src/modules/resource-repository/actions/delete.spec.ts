import { Resource, ResourceMetadata } from '..';
import { applyResourceDeletions } from './delete';

describe('applyResourceDeletions', () => {
  it('Deletes existing resources', () => {
    const existingResource: Resource = { metadata: { namespace: 'namespace', name: 'name' } };
    const deletion: ResourceMetadata = { namespace: 'namespace', name: 'name' };

    const resources = applyResourceDeletions([existingResource], [deletion]);
    expect(resources).toHaveLength(0);
  });

  it('Do nothing for non-existent resource deletion', () => {
    const existingResource: Resource = { metadata: { namespace: 'namespace', name: 'name' } };
    const deletion: ResourceMetadata = { namespace: 'namespace', name: 'name2' };

    const resources = applyResourceDeletions([existingResource], [deletion]);
    expect(resources).toHaveLength(1);
    expect(resources[0]).toBe(existingResource);
  });
});
