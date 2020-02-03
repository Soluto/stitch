import {Command, flags} from '@oclif/command';
import {promises as fs} from 'fs';
import * as path from 'path';
import {safeLoadAll} from 'js-yaml';
import {uploadResourceGroup} from '../../client';
import {ResourceGroupInput} from '../../client/types';

export default class ApplyResources extends Command {
    static description = 'Apply resources';

    static examples = [
        `$ stitch apply:resources schema.gql
Uploaded successfully!
`,
    ];

    static flags = {
        registryUrl: flags.string({required: true, env: 'STITCH_REGISTRY_URL', description: 'Url of the registry'}),
    };

    static args = [{name: 'fileOrDirectory', required: true}];

    async run() {
        const {args, flags} = this.parse(ApplyResources);

        this.log(`Uploading resource ${args.fileOrDirectory}`);

        const resourceGroup = await this.pathToResourceGroup(args.fileOrDirectory);

        await uploadResourceGroup(flags.registryUrl, resourceGroup);
    }

    async pathToResourceGroup(filePath: string): Promise<ResourceGroupInput> {
        const fileStats = await fs.stat(filePath);

        if (fileStats.isFile()) {
            const fileContentsBuf = await fs.readFile(filePath);
            const contents = safeLoadAll(fileContentsBuf.toString());
            return this.resourcesToResourceGroup({[filePath]: contents});
        }

        if (fileStats.isDirectory()) {
            const dir = await fs.readdir(filePath);

            const subRgs = await Promise.all(
                dir.map(subPath => this.pathToResourceGroup(path.join(filePath, subPath)))
            );
            const resultRg = subRgs.reduce(
                (rg, subRg) => ({
                    schemas: safeConcat(rg.schemas, subRg.schemas),
                    upstreams: safeConcat(rg.upstreams, subRg.upstreams),
                    upstreamClientCredentials: safeConcat(
                        rg.upstreamClientCredentials,
                        subRg.upstreamClientCredentials
                    ),
                }),
                {schemas: [], upstreams: [], upstreamClientCredentials: []}
            );

            return resultRg;
        }

        // This should only happen with weird symlinks etc
        return {schemas: [], upstreams: [], upstreamClientCredentials: []};
    }

    resourcesToResourceGroup(files: {[filepath: string]: any[]}) {
        const rg: ResourceGroupInput = {schemas: [], upstreams: [], upstreamClientCredentials: []};

        for (const filepath in files) {
            const resources = files[filepath];
            for (const resourceWithKind of resources) {
                const {kind, ...resource} = resourceWithKind;
                // We don't bother validating the resources, since GraphQL provides a strong enough validation
                // Client-side validation can be added later on to not require a server hop
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
                    default:
                        this.log('Unknown resource kind', filepath);
                        continue;
                }
            }
        }

        return rg;
    }
}

function safeConcat<T>(...arrays: (T[] | null | undefined)[]) {
    return ([] as T[]).concat(...arrays.filter(Array.isArray));
}
