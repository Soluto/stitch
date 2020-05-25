import {ResourceGroup, ResourceRepository} from '.';
import * as envVar from 'env-var';
import {promises as fs} from 'fs';
import * as path from 'path';
import {FetchLatestResult} from './types';

export class FileSystemResourceRepository implements ResourceRepository {
    protected current?: {mtime: number; rg: ResourceGroup};
    protected policyAttachmentsDirInitialized = false;

    constructor(protected pathToFile: string, protected policyAttachmentsFolderPath: string) {}

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

    async writePolicyAttachment(filename: string, content: Buffer): Promise<void> {
        await this.initializePolicyAttachmentsDir();

        const filePath = path.resolve(this.policyAttachmentsFolderPath, filename);
        await fs.writeFile(filePath, content);
    }

    private async initializePolicyAttachmentsDir() {
        if (this.policyAttachmentsDirInitialized) return;

        await fs.mkdir(this.policyAttachmentsFolderPath, {recursive: true});
        this.policyAttachmentsDirInitialized = true;
    }

    static fromEnvironment() {
        const pathToFile = envVar
            .get('FS_RESOURCE_REPOSITORY_PATH')
            .required()
            .asString();
        const policyAttachmentsFolderPath = envVar
            .get('FS_REPOSITORY_POLICY_ATTACHMENTS_FOLDER_PATH')
            .required()
            .asString();

        return new FileSystemResourceRepository(pathToFile, policyAttachmentsFolderPath);
    }
}
