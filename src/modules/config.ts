import * as envVar from 'env-var';

export const resourceBucketName = envVar
    .get('RESOURCE_BUCKET_NAME')
    .required()
    .asString();
export const resourcesObjectKey = envVar.get('RESOURCE_OBJECT_KEY', 'resources.json').asString();
export const s3endpoint = envVar
    .get('S3_ENDPOINT')
    .required()
    .asString();
export const awsAccessKeyId = envVar
    .get('AWS_ACCESS_KEY_ID')
    .required()
    .asString();
export const awsSecretAccessKey = envVar
    .get('AWS_SECRET_ACCESS_KEY')
    .required()
    .asString();
