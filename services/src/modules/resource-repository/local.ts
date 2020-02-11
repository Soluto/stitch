import {ResourceGroup, ResourceRepository} from '.';
import {localResourceRepositoryPath} from '../config';
import fs from 'fs';
import {promisify} from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

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
        const json = await readFile(this.localPath, 'utf8');
        return JSON.parse(json);
    }

    async update(rg: ResourceGroup): Promise<void> {
        const {etag, ...rgWithoutEtag} = rg;
        await writeFile(this.localPath, JSON.stringify(rgWithoutEtag));
    }
}
