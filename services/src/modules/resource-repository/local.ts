import {ResourceGroup, ResourceRepository} from '.';
import {localResourceRepositoryPath} from '../config';
import {promises as fs} from 'fs';

export class LocalResourceRepository implements ResourceRepository {
    protected localPath: string;

    constructor() {
        if (!localResourceRepositoryPath) {
            throw new Error("Must configure 'LOCAL_RESOURCE_REPO_PATH' for Local repository to work!");
        } else {
            this.localPath = localResourceRepositoryPath;
        }
    }

    /** Returns latest resource group */
    fetch(): Promise<ResourceGroup>;
    async fetch(): Promise<ResourceGroup | null> {
        const json = await fs.readFile(this.localPath, 'utf8');
        return JSON.parse(json);
    }

    async update(rg: ResourceGroup): Promise<void> {
        const {etag, ...rgWithoutEtag} = rg;
        await fs.writeFile(this.localPath, JSON.stringify(rgWithoutEtag));
    }
}
