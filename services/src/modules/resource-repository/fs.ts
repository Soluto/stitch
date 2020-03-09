import {ResourceGroup, ResourceRepository} from '.';
import * as envVar from 'env-var';
import {promises as fs} from 'fs';
import {FetchLatestResult} from './types';

export class FileSystemResourceRepository implements ResourceRepository {
    protected current?: {mtime: number; rg: ResourceGroup};

    constructor(protected pathToFile: string) {}

    async fetchLatest(): Promise<FetchLatestResult> {
        const stats = await fs.stat(this.pathToFile);

        if (this.current && stats.mtimeMs === this.current.mtime) {
            return {isNew: false, resourceGroup: this.current.rg};
        }

        const contents = await fs.readFile(this.pathToFile, 'utf8');
        const rg = JSON.parse(contents) as ResourceGroup;
        this.current = {mtime: stats.mtimeMs, rg};

        return {isNew: true, resourceGroup: rg};
    }

    async update(rg: ResourceGroup): Promise<void> {
        await fs.writeFile(this.pathToFile, JSON.stringify(rg));
    }

    static fromEnvironment() {
        const pathToFile = envVar
            .get('FS_RESOURCE_REPOSITORY_PATH')
            .required()
            .asString();

        return new FileSystemResourceRepository(pathToFile);
    }
}
