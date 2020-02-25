import * as envVar from 'env-var';

// General
export const httpPort = envVar
    .get('PORT')
    .default('8080')
    .asIntPositive();
export const logLevel = envVar
    .get('LOG_LEVEL')
    .default('WARN')
    .asString();
export const nodeEnv = envVar
    .get('NODE_ENV')
    .default('development')
    .asString();

// S3/Resources
export const resourceBucketName = envVar
    .get('RESOURCE_BUCKET_NAME')
    .required()
    .asString();
export const resourcesObjectKey = envVar
    .get('RESOURCE_OBJECT_KEY')
    .default('resources.json')
    .asString();
export const s3endpoint = envVar
    .get('S3_ENDPOINT')
    .required()
    .asString();
export const awsAccessKeyId = envVar.get('AWS_ACCESS_KEY_ID').asString();
export const awsSecretAccessKey = envVar.get('AWS_SECRET_ACCESS_KEY').asString();
export const resourceUpdateInterval = envVar
    .get('RESOURCE_UPDATE_INTERVAL')
    .default('60000')
    .asIntPositive();

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

// GraphQL configuration
export const enableGraphQLTracing = envVar
    .get('GRAPHQL_TRACING')
    .default('true')
    .asBool();
export const enableGraphQLPlayground = envVar
    .get('GRAPHQL_PLAYGROUND')
    .default('true')
    .asBoolStrict();
export const enableGraphQLIntrospection = envVar
    .get('GRAPHQL_INTROSPECTION')
    .default('true')
    .asBoolStrict();
