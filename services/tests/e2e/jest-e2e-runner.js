const { join } = require('path');
const { readdir, lstat } = require('fs').promises;
const { execSync } = require('child_process');

const DefaultJestRunner = require('jest-runner');
const dockerCompose = require('docker-compose');
const waitFor = require('./wait-for');

const options = {
  cwd: __dirname,
  env: {
    COMPOSE_DOCKER_CLI_BUILD: '1',
    DOCKER_BUILDKIT: '1',
    PATH: process.env.PATH,
  },
  log: true,
};

class SerialJestRunner extends DefaultJestRunner {
  constructor(config, context) {
    super(config, context);
    this.isSerial = true;
  }

  async setup() {
    await this.preparePlugins();

    await dockerCompose.buildAll(options);
    await dockerCompose.upAll(options);

    await waitFor.start(30000);
  }

  async teardown() {
    // await dockerCompose.logs(['gateway', 'registry', 'oidc-server-mock'], options);
    await dockerCompose.down(options);
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
