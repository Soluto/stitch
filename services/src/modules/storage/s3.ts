import * as AWS from 'aws-sdk';
import { S3 } from 'aws-sdk';
import { Storage, FileStats, listFilesItem } from '.';

export class S3Storage implements Storage {
  protected s3: AWS.S3;

  constructor(bucket: string, endpoint: string, accessKeyId?: string, secretAccessKey?: string) {
    this.s3 = new AWS.S3({
      params: { Bucket: bucket },
      endpoint,
      accessKeyId,
      secretAccessKey,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
  }

  async fileStats(filePath: string): Promise<FileStats> {
    const stats = await this.s3.headObject({ Key: filePath } as S3.HeadObjectRequest).promise();

    if (!stats.LastModified) throw new Error(`s3 key ${filePath} does not exist`);
    return { lastModified: stats.LastModified };
  }

  async readFile(filePath: string): Promise<{ content: Buffer; etag: string }>;
  async readFile(filePath: string, options: { [k in any]: never }): Promise<{ content: Buffer; etag: string }>;
  async readFile(filePath: string, options: { etag?: string }): Promise<{ content: Buffer; etag: string }>;
  async readFile(filePath: string, options: { asString?: true }): Promise<{ content: string; etag: string }>;
  async readFile(
    filePath: string,
    options: { asString?: true; etag?: string }
  ): Promise<{ content: string; etag: string }>;
  async readFile(
    filePath: string,
    options: { asString?: boolean; etag?: string } = {}
  ): Promise<{ content: Buffer | string; etag?: string }> {
    const getParams: Partial<AWS.S3.GetObjectRequest> = { Key: filePath };
    if (options.etag) getParams.IfNoneMatch = options.etag;
    const res = await this.s3.getObject(getParams as S3.GetObjectRequest).promise();

    if (!res.Body) throw new Error(`s3 key ${filePath} does not exist`);

    const content = options.asString ? res.Body.toString() : (res.Body as Buffer);
    return { content, etag: res.ETag };
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    await this.s3.putObject({ Key: filePath, Body: content } as S3.PutObjectRequest).promise();
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.s3.deleteObject({ Key: filePath } as S3.DeleteObjectRequest).promise();
  }

  async listFiles(folderPath: string): Promise<listFilesItem[]> {
    const attachments: listFilesItem[] = [];
    let isTruncated = true;
    let continuationToken;

    while (isTruncated) {
      const params: Partial<AWS.S3.Types.ListObjectsV2Request> = {
        MaxKeys: 1000,
        Prefix: folderPath,
      };
      if (continuationToken) params.ContinuationToken = continuationToken;

      const listResults = await this.s3.listObjectsV2(params as S3.ListObjectsV2Request).promise();
      const keys = listResults.Contents || [];
      const newAttachments: listFilesItem[] = keys.map(k => ({
        filePath: k.Key!,
        lastModified: k.LastModified!,
      }));
      attachments.push(...newAttachments);

      isTruncated = listResults.IsTruncated!;
      if (isTruncated) continuationToken = listResults.ContinuationToken;
    }

    return attachments;
  }
}
