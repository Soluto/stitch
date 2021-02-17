import { Command, flags } from '@oclif/command';
import { refreshRemoteSchema } from '../../client';
import getEnvInfo from '../../utils/get-env-info';

export default class ApplyResources extends Command {
  static description = 'Refresh remote schema';

  static examples = [
    `$ stitch refresh:remote-schema http://remote-graphql-server/graphql
Remote schema refreshed successfully!
`,
  ];

  static flags = {
    'registry-url': flags.string({ required: true, env: 'STITCH_REGISTRY_URL', description: 'Url of the registry' }),
    'authorization-header': flags.string({ required: false, description: 'Custom authorization header' }),
    timeout: flags.integer({ required: false, default: 10000, description: 'Request timeout' }),
    verbose: flags.boolean({ required: false, default: false, description: 'Verbose mode' }),
  };

  static args = [{ name: 'remoteServerUrl', required: true }];

  private verboseMode = false;

  async run() {
    const { args, flags } = this.parse(ApplyResources);
    this.verboseMode = flags['verbose'];

    try {
      this.log(`Refreshing remote schema...`);
      const {
        result: { success },
      } = await refreshRemoteSchema(
        args.remoteServerUrl,
        {
          registryUrl: flags['registry-url'],
          authorizationHeader: flags['authorization-header'],
        },
        {
          timeout: flags.timeout,
        }
      );

      if (success) {
        this.log(`Remote schema from ${args.remoteServerUrl} was refreshed successfully.`);
      } else {
        throw new Error('Something went wrong');
      }
    } catch (e) {
      this.error(
        `Refresh remote schema failed. ${e}

          ${getEnvInfo(this.config, 'refresh:remote-schema')}`,
        { ...e, exit: true }
      );
    }
  }

  async trace(message?: string, ...args: any[]) {
    if (this.verboseMode) {
      this.log(message, ...args);
    }
  }
}
