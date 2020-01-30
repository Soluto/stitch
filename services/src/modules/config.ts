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
export const awsAccessKeyId = envVar.get('AWS_ACCESS_KEY_ID').asString();
export const awsSecretAccessKey = envVar.get('AWS_SECRET_ACCESS_KEY').asString();
export const resourceUpdateInterval = envVar.get('RESOURCE_UPDATE_INTERVAL', '60000').asIntPositive();
export const httpPort = envVar.get('PORT', '8080').asIntPositive();
export const logLevel = envVar.get('LOG_LEVEL', 'WARN').asString();
export const nodeEnv = envVar.get('NODE_ENV', 'development').asString();

const awsIdentityTokenFile = envVar.get('AWS_WEB_IDENTITY_TOKEN_FILE').asString();
const awsRoleArn = envVar.get('AWS_ROLE_ARN').asString();
if (
    (typeof awsAccessKeyId === 'undefined' || awsSecretAccessKey === 'undefined') &&
    (typeof awsIdentityTokenFile === 'undefined' || typeof awsRoleArn === 'undefined')
) {
    throw new Error(
        'S3 environment variables not found. Expected either AWS_ACCESS_KEY_ID&AWS_SECRET_ACCESS_KEY or AWS_WEB_IDENTITY_TOKEN_FILE&AWS_ROLE_ARN to be present'
    );
}
