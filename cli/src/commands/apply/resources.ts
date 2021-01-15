import { Command, flags } from '@oclif/command';
import { ResourceGroupInput, uploadResourceGroup } from '../../client';
import listResourceFiles from '../../utils/list-resource-files';
import readResourceFile from '../../utils/read-resource-file';
import getEnvInfo from '../../utils/get-env-info';

const printListItem = (f: string) => `  - ${f}`;

export default class ApplyResources extends Command {
  static description = 'Apply resources';

  static examples = [
    `$ stitch apply:resources schema.gql
Uploaded successfully!
`,
  ];

  static flags = {
    'registry-url': flags.string({ required: true, env: 'STITCH_REGISTRY_URL', description: 'Url of the registry' }),
    'dry-run': flags.boolean({ required: false, default: false, description: 'Should perform a dry run' }),
    'authorization-header': flags.string({ required: false, description: 'Custom authorization header' }),
    'skip-resource-types': flags.string({ required: false, description: 'Resource types to skip' }),
    timeout: flags.integer({ required: false, default: 10000, description: 'Request timeout' }),
    verbose: flags.boolean({ required: false, default: false, description: 'Verbose mode' }),
  };

  static args = [{ name: 'resourcesPath', required: true }];

  private verboseMode = false;

  async run() {
    const { args, flags } = this.parse(ApplyResources);
    const dryRun = flags['dry-run'];
    this.verboseMode = flags['verbose'];

    if (dryRun) {
      this.log(`Dry run mode ON - No changes will be made to the registry`);
    }

    try {
      const resourceTypesToSkip = flags['skip-resource-types']?.split(',');

      this.log(`Looking for resources at ${args.resourcesPath}...`);
      const resourceGroup = await this.pathToResourceGroup(args.resourcesPath, resourceTypesToSkip);
      const resourceCounts = Object.entries(resourceGroup).map(([key, value]) => ({ key, count: value?.length ?? 0 }));
      this.log('The following resources found:');
      resourceCounts.forEach(({ key, count }) =>
        this.log(`  ${key}: ${count}${resourceTypesToSkip?.includes(key) ? ' - Skipped' : ''}`)
      );

      this.log(`${dryRun ? 'Verifying' : 'Uploading'} resources...`);
      const {
        result: { success },
      } = await uploadResourceGroup(
        resourceGroup,
        {
          registryUrl: flags['registry-url'],
          authorizationHeader: flags['authorization-header'],
          dryRun,
        },
        {
          timeout: flags.timeout,
        }
      );

      if (success) {
        this.log(`Resources from ${args.resourcesPath} were ${dryRun ? 'verified' : 'uploaded'} successfully.`);
      } else {
        throw new Error('Something went wrong');
      }
    } catch (e) {
      this.error(
        `${dryRun ? 'Verifying' : 'Uploading'} resources failed. ${e}

          ${getEnvInfo(this.config, 'apply:resources')}`,
        { ...e, exit: true }
      );
    }
  }

  async pathToResourceGroup(filePath: string, resourceTypesToSkip?: string[]): Promise<ResourceGroupInput> {
    const rg: ResourceGroupInput = { schemas: [], upstreams: [], upstreamClientCredentials: [], policies: [] };

    const resourceFiles = await listResourceFiles(filePath);
    this.trace(`Found ${resourceFiles.length} resource files:\n${resourceFiles.map(printListItem).join('\n')}`);

    this.trace('Loading resources...');
    for (const resourceFile of resourceFiles) {
      this.trace(`  Loading resources from ${resourceFile}...`);
      const resourceMap = await readResourceFile(resourceFile, resourceTypesToSkip);
      this.trace('  The following resources loaded:');
      Object.entries(resourceMap).forEach(([kind, resources]) =>
        this.trace('  ' + printListItem(`${kind}: ${resources?.length ?? 0}`))
      );
      this.addToResourceGroup(resourceMap, rg);
    }

    return rg;
  }

  async addToResourceGroup(resourceMap: { [kind: string]: any[] }, rg: ResourceGroupInput) {
    for (const kind in resourceMap) {
      const resourceList = resourceMap[kind];
      for (const resource of resourceList) {
        switch (kind) {
          case 'Schema':
            rg.schemas!.push(resource);
            continue;
          case 'Upstream':
            rg.upstreams!.push(resource);
            continue;
          case 'UpstreamClientCredentials':
            rg.upstreamClientCredentials!.push(resource);
            continue;
          case 'Policy':
            rg.policies!.push(resource);
            continue;
          default:
            this.log('Unknown resource kind', kind);
            continue;
        }
      }
    }
  }

  async trace(message?: string, ...args: any[]) {
    if (this.verboseMode) {
      this.log(message, ...args);
    }
  }
}
