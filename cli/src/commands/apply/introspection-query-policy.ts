import { promises as fs } from 'fs';
import { safeLoad } from 'js-yaml';
import Command, { flags } from '@oclif/command';
import { IntrospectionQueryPolicyInput, uploadIntrospectionQueryPolicy } from '../../client';
import getEnvInfo from '../../utils/get-env-info';

export default class ApplyIntrospectionQueryPolicy extends Command {
  static description = 'Apply introspection query policy';

  static examples = [
    `
      $ stitch apply:introspection-query-policy introspection-query-policy.yaml
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
    const { args, flags } = this.parse(ApplyIntrospectionQueryPolicy);
    const dryRun = flags['dry-run'];

    if (dryRun) {
      this.log(`Dry run mode ON - No changes will be made to the registry`);
    }

    try {
      this.log(`${dryRun ? 'Verifying' : 'Uploading'} introspection query policy from ${args.resourcePath}...`);
      const introspectionQueryPolicyContent = await fs.readFile(args.resourcePath, { encoding: 'utf8' });
      const introspectionQueryPolicy = safeLoad(introspectionQueryPolicyContent) as IntrospectionQueryPolicyInput;

      const {
        result: { success },
      } = await uploadIntrospectionQueryPolicy(
        introspectionQueryPolicy,
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
        this.log(
          `introspection query policy from ${args.resourcePath} was ${dryRun ? 'verified' : 'uploaded'} successfully.`
        );
      } else {
        throw new Error('Something went wrong');
      }
    } catch (e) {
      this.error(
        `${dryRun ? 'Verifying' : 'Uploading'} of introspection query policy failed. ${e}

          ${getEnvInfo(
            this.config,
            'apply:introspection-query-policy',
            flags['registry-url'],
            flags['authorization-header']
          )}`,
        { ...e, exit: true }
      );
    }
  }
}
