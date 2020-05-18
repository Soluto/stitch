import {ResourceGroup, ResourceRepository} from '.';
import * as envVar from 'env-var';
import {promises as fs} from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import * as config from '../config';
import logger from '../logger';
import {FetchLatestResult} from './types';

export class FileSystemResourceRepository implements ResourceRepository {
    protected current?: {mtime: number; rg: ResourceGroup};
    protected policyAttachmentsDirInitialized = false;
    protected policyAttachments: {[filename: string]: Buffer} = {};
    protected policyAttachmentsRefreshedAt?: Date;

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

    public getPolicyAttachment(filename: string): Buffer {
        return this.policyAttachments[filename];
    }

    public async initializePolicyAttachments() {
        try {
            await this.refreshPolicyAttachments();
        } catch (err) {
            logger.fatal({err}, 'Failed fetching fs policy attachments on startup');
            throw err;
        }

        setInterval(async () => {
            try {
                await this.refreshPolicyAttachments();
            } catch (err) {
                logger.error(
                    {err},
                    `Failed refreshing fs policy attachments, last successful refresh was at ${this.policyAttachmentsRefreshedAt}`
                );
            }
        }, config.resourceUpdateInterval);
    }

    private async refreshPolicyAttachments() {
        const newRefreshedAt = new Date();

        const allAttachments = await this.getPolicyAttachmentsList();
        const attachmentsToRefresh = allAttachments
            .filter(a => this.shouldRefreshPolicyAttachment(a))
            .map(a => a.filename);

        if (attachmentsToRefresh.length > 0) {
            const newAttachments = await this.getPolicyAttachments(attachmentsToRefresh);
            newAttachments.forEach(a => (this.policyAttachments[a.filename] = a.content));
        }

        this.policyAttachmentsRefreshedAt = newRefreshedAt;
    }

    private shouldRefreshPolicyAttachment({filename, updatedAt}: {filename: string; updatedAt: Date}) {
        if (!this.policyAttachments[filename]) return true;
        if (!this.policyAttachmentsRefreshedAt) return true;

        return updatedAt > this.policyAttachmentsRefreshedAt;
    }

    private async getPolicyAttachmentsList(): Promise<{filename: string; updatedAt: Date}[]> {
        const filenames = await fs.readdir(this.policyAttachmentsFolderPath);
        const limit = pLimit(10);

        return Promise.all(
            filenames.map(filename => {
                return limit(async () => {
                    const filePath = path.resolve(this.policyAttachmentsFolderPath, filename);
                    const stats = await fs.stat(filePath);

                    const updatedAt = stats.mtime;
                    return {filename, updatedAt};
                });
            })
        );
    }

    private async getPolicyAttachments(filenames: string[]): Promise<{filename: string; content: Buffer}[]> {
        const limit = pLimit(10);

        return Promise.all(
            filenames.map(filename => {
                return limit(async () => {
                    const filePath = path.resolve(this.policyAttachmentsFolderPath, filename);
                    const content = await fs.readFile(filePath);

                    return {filename, content};
                });
            })
        );
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
