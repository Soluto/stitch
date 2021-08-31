const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.CI ? 'silent' : 'trace';

process.env.RESOURCE_UPDATE_INTERVAL = '400';
process.env.FS_RESOURCE_REPOSITORY_PATH = './tests/blackbox/resources/resources-gateway.json';
process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH = './tests/blackbox/resources/resources-registry.json';

process.env.FS_REPOSITORY_POLICY_ATTACHMENTS_FOLDER_PATH = './tests/blackbox/resources/policy-attachments';

process.env.FS_RESOURCE_METADATA_PATH = './tests/blackbox/resources/resources-gateway-metadata.json';
process.env.FS_REGISTRY_RESOURCE_METADATA_PATH = './tests/blackbox/resources/resources-registry-metadata.json';

process.env.USE_S3_RESOURCE_REPOSITORY = 'false';
process.env.USE_FS_RESOURCE_REPOSITORY = 'true';

process.env.CORS_CONFIGURATION = JSON.stringify({
  methods: ['GET', 'POST'],
  origin: ['http://localhost', 'http://my-web-app.com'],
  allowedHeaders: ['x-api-client', 'authorization'],
});

process.env.AUTHENTICATION_CONFIGURATION = JSON.stringify({
  anonymous: {
    publicPaths: ['/metrics', '/.well-known/apollo/server-health', '/graphql', '/updateSchema', '/status'],
  },
});

process.env.CHILD_LOGGERS_LEVELS = JSON.stringify({ request: 'warn' });

process.env.LOGGER_CONFIGURATION = JSON.stringify({ redact: ['errors[*].extensions'] });

const resourceDir = './tests/blackbox/resources';

fs.mkdirSync(resourceDir, { recursive: true });
