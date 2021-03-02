import { promises as fs } from 'fs';
import { safeLoad } from 'js-yaml';
import Command, { flags } from '@oclif/command';
import { BasePolicyInput, uploadBasePolicy } from '../../client';
import getEnvInfo from '../../utils/get-env-info';

export default class ApplyBasePolicy extends Command {
  static description = 'Apply base policy';

  static examples = [
    `
      $ stitch apply:base-policy base-policy.yaml
      Uploaded successfully!
    `,
  ];

  static flags = {
    'registry-url': flags.string({ required: true, env: 'STITCH_REGISTRY_URL', description: 'Url of the registry' }),
    'dry-run': flags.boolean({ required: false, default: false, description: 'Should perform a dry run' }),
    'authorization-header': flags.string({ required: false, description: 'Custom authorization header' }),
    timeout: flags.integer({ required: false, default: 10000, description: 'Request timeout' }),
  };

  static args = [{ name: 'resourcePath', required: true }];

  async run() {
    const { args, flags } = this.parse(ApplyBasePolicy);
    const dryRun = flags['dry-run'];

    if (dryRun) {
      this.log(`Dry run mode ON - No changes will be made to the registry`);
    }

    try {
      this.log(`${dryRun ? 'Verifying' : 'Uploading'} base policy from ${args.resourcePath}...`);
      const basePolicyContent = await fs.readFile(args.resourcePath, { encoding: 'utf8' });
      const basePolicy = safeLoad(basePolicyContent) as BasePolicyInput;

      const {
        result: { success },
      } = await uploadBasePolicy(
        basePolicy,
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
        this.log(`Base policy from ${args.resourcePath} was ${dryRun ? 'verified' : 'uploaded'} successfully.`);
      } else {
        throw new Error('Something went wrong');
      }
    } catch (e) {
      this.error(
        `${dryRun ? 'Verifying' : 'Uploading'} of base policy failed. ${e}

          ${getEnvInfo(this.config, 'apply:base-policy', flags['registry-url'], flags['authorization-header'])}`,
        { ...e, exit: true }
      );
    }
  }
}
