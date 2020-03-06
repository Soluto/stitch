import {ResourceGroup, ResourceRepository} from '.';
import * as envVar from 'env-var';
import {promises as fs} from 'fs';

export class FileSystemResourceRepository implements ResourceRepository {
    constructor(protected pathToFile: string) {}

    async fetchLatest(): Promise<ResourceGroup> {
        const rg = await this.fetchLatestIfNeeded(undefined);
        return rg ? rg : {schemas: [], upstreams: [], upstreamClientCredentials: []};
    }

    async fetchLatestIfNeeded(etag?: string): Promise<ResourceGroup | null> {
        const stats = await fs.stat(this.pathToFile);

        if (etag && stats.mtime.toString() === etag) {
            return null;
        }

        const contents = await fs.readFile(this.pathToFile, 'utf8');
        const rg = JSON.parse(contents) as ResourceGroup;
        rg.etag = stats.mtimeMs.toString();

        return rg;
    }

    async update(rg: ResourceGroup): Promise<void> {
        const {etag, ...rgWithoutEtag} = rg;
        await fs.writeFile(this.pathToFile, JSON.stringify(rgWithoutEtag));
    }

    static fromEnvironment() {
        const pathToFile = envVar
            .get('RESOURCE_REPOSITORY_FS_PATH')
            .required()
            .asString();

        return new FileSystemResourceRepository(pathToFile);
    }
}
