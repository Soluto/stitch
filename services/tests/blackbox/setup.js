const fs = require('fs');

process.env.NODE_ENV = 'test';

process.env.RESOURCE_UPDATE_INTERVAL = '400';
process.env.FS_RESOURCE_REPOSITORY_PATH = './tests/blackbox/resources/resources-gateway.json';
process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH = './tests/blackbox/resources/resources-registry.json';
process.env.FS_REPOSITORY_POLICY_ATTACHMENTS_FOLDER_PATH = './tests/blackbox/resources/policy-attachments';

process.env.USE_S3_RESOURCE_REPOSITORY = 'false';
process.env.USE_FS_RESOURCE_REPOSITORY = 'true';

process.env.AUTHENTICATION_CONFIGURATION = JSON.stringify({
  anonymous: {
    publicPaths: ['/metrics', '/.well-known/apollo/server-health', '/graphql'],
  },
});

process.env.LOGGER_CONFIGURATION = JSON.stringify({ redact: ['errors[*].extensions'] });

const resourceDir = './tests/blackbox/resources';

if (!fs.existsSync(resourceDir)) {
  fs.mkdirSync(resourceDir);
}
