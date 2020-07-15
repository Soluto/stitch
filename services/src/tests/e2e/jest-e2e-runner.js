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
    await dockerCompose.buildAll(options);
    await dockerCompose.upAll(options);

    await Promise.all([waitFor.gatewayStart(30000), waitFor.registryStart(30000)]);
  }

  async teardown() {
    // await dockerCompose.logs(['gateway', 'registry'], options);
    await dockerCompose.down(options);
    await Promise.all([waitFor.gatewayStop(10000), waitFor.registryStop(10000)]);
  }

  async runTests(tests, watcher, onStart, onResult, onFailure, options) {
    try {
      await this.setup();
      await super.runTests(tests, watcher, onStart, onResult, onFailure, options);
    } finally {
      await this.teardown();
    }
  }
}

module.exports = SerialJestRunner;
