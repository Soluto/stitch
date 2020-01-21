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
export const resourceUpdateInterval = envVar.get('RESOURCE_UPDATE_INTERVAL', '60000').asIntPositive();
export const httpPort = envVar.get('PORT', '8080').asIntPositive();
export const logLevel = envVar.get('LOG_LEVEL', 'WARN').asString();
export const nodeEnv = envVar.get('NODE_ENV', 'development').asString();
