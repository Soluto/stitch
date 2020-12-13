const { join } = require('path');
const { readdir, lstat } = require('fs').promises;
const { execSync } = require('child_process');

const DefaultJestRunner = require('jest-runner');
const dockerCompose = require('docker-compose');
const waitFor = require('./wait-for');

const options = {
  cwd: __dirname,
  config: ['docker-compose.yml', 'docker-compose.ignore-policies.yml'],
  env: {
    COMPOSE_DOCKER_CLI_BUILD: '1',
    DOCKER_BUILDKIT: '1',
    PATH: process.env.PATH,
  },
  log: true,
};

const upAdditionalOptions = {
  commandOptions: ['--force-recreate', '--remove-orphans', '--renew-anon-volumes'],
};

const downAdditionalOptions = {
  commandOptions: ['--volumes', '--remove-orphans'],
};

class SerialJestRunner extends DefaultJestRunner {
  constructor(config, context) {
    super(config, context);
    this.isSerial = true;
  }

  async setup() {
    if (!process.env.SKIP_PLUGINS_INSTALL) {
      await this.preparePlugins();
    }

    if (!process.env.SKIP_IMAGE_BUILD) {
      await dockerCompose.buildAll(options);
    }

    await dockerCompose.upAll({ ...options, ...upAdditionalOptions });

    await waitFor.start(30000);
  }

  async teardown() {
    if (process.env.PRINT_CONTAINER_LOGS) {
      await dockerCompose.logs(['gateway', 'registry'], options);
    }
    await dockerCompose.down({ ...options, ...downAdditionalOptions });
    await waitFor.stop(30000);
  }

  async runTests(tests, watcher, onStart, onResult, onFailure, options) {
    try {
      await this.setup();
      await super.runTests(tests, watcher, onStart, onResult, onFailure, options);
    } finally {
      await this.teardown();
    }
  }

  async preparePlugins() {
    const pluginsDir = join(__dirname, './config/plugins');
    const pluginList = await readdir(pluginsDir);
    for (const name of pluginList) {
      const pluginPath = join(pluginsDir, name);
      const pluginStat = await lstat(pluginPath);
      if (pluginStat.isDirectory()) {
        const packageJsonPath = join(pluginPath, 'package.json');
        const packageJsonStat = await lstat(packageJsonPath).catch(() => null);
        if (packageJsonStat) {
          const result = execSync('npm install', { encoding: 'utf8', cwd: pluginPath });
          console.log(result);
        }
      }
    }
  }
}

module.exports = SerialJestRunner;
