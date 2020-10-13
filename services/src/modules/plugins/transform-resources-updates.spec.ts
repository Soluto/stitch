import * as _ from 'lodash';
import { PolicyType, ResourceGroup } from '../resource-repository';
import { plugins, transformResourcesUpdates } from './apply-plugins';
import { StitchPlugin } from './types';

const resourceGroup: Partial<ResourceGroup> = {
  schemas: [
    {
      metadata: {
        namespace: 'ns',
        name: 'old-name',
      },
      schema: `
              type Query {
                foo: String!
              }
            `,
    },
  ],
};
const loadedPlugins: StitchPlugin[] = [
  {
    name: 'rename-name',
    transformResourcesUpdates(updates: Partial<ResourceGroup>) {
      return _.set(updates, 'schemas[0].metadata.name', 'new-name');
    },
  },
  {
    name: 'rename-namespace',
    transformResourcesUpdates(updates: Partial<ResourceGroup>) {
      return _.set(updates, 'schemas[0].metadata.namespace', 'new-ns');
    },
  },
  {
    name: 'do-nothing',
  },
  {
    name: 'transform-resource-group',
    transformResourceGroup(resourceGroup: ResourceGroup) {
      return {
        ...resourceGroup,
        policies: [
          {
            metadata: {
              namespace: 'ns',
              name: 'policy',
            },
            type: PolicyType.opa,
            code: 'REGO code',
          },
        ],
      };
    },
  },
];

describe('Plugins: transformResourcesUpdates', () => {
  test('transformResourcesUpdates', async () => {
    plugins.splice(0, plugins.length);
    plugins.push(...loadedPlugins);
    const result = await transformResourcesUpdates(resourceGroup);
    expect(result).toMatchSnapshot();
  });
});
