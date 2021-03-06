process.env.S3_RESOURCE_BUCKET_NAME = 'stitch-resources-integration';
process.env.S3_RESOURCE_OBJECT_KEY = 'stitch-gateway.json';
process.env.S3_REGISTRY_RESOURCE_OBJECT_KEY = 'stitch-registry.json';
process.env.S3_RESOURCE_METADATA_OBJECT_KEY = 'stitch-gateway-metadata.json';
process.env.S3_REGISTRY_RESOURCE_METADATA_OBJECT_KEY = 'stitch-registry-metadata.json';
process.env.S3_ENDPOINT = 'http://test.s3';
process.env.S3_POLICY_ATTACHMENTS_KEY_PREFIX = 'policyAttachments/';

process.env.USE_S3_RESOURCE_REPOSITORY = 'true';
process.env.USE_FS_RESOURCE_REPOSITORY = 'false';

process.env.AWS_ACCESS_KEY_ID = 'something';
process.env.AWS_SECRET_ACCESS_KEY = 'something';
process.env.LOG_LEVEL = 'fatal';
process.env.NODE_ENV = 'production';
process.env.RESOURCE_UPDATE_INTERVAL = 500;
