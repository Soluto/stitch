import {applyResourceUpdates} from './updates';

describe('applyResourceUpdates', () => {
    it('Inserts new resources', () => {
        const existingResource = {metadata: {namespace: 'namespace', name: 'name'}};
        const newResource = {metadata: {namespace: 'namespace2', name: 'name2'}};

        const resources = applyResourceUpdates([existingResource], [newResource]);
        expect(resources).toHaveLength(2);
        expect(resources[0]).toBe(existingResource);
        expect(resources[1]).toBe(newResource);
    });

    it('Replaces existing resource when namespace/name matches', () => {
        const existingResource = {metadata: {namespace: 'namespace', name: 'name'}};
        const newResource = {...existingResource};

        const resources = applyResourceUpdates([existingResource], [newResource]);
        expect(resources).toHaveLength(1);
        expect(resources[0]).toBe(newResource);
    });
});
