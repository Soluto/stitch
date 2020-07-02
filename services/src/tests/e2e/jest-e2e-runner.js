const DefaultJestRunner = require('jest-runner');
const dockerCompose = require('docker-compose');
const waitFor = require('./wait-for');

class SerialJestRunner extends DefaultJestRunner {
  constructor(config, context) {
    super(config, context);
    this.isSerial = true;
  }

  async setup() {
    await dockerCompose.buildAll({ cwd: __dirname, log: true });
    await dockerCompose.upAll({ cwd: __dirname, log: true });
    await Promise.all([waitFor.gatewayStart(30000), waitFor.registryStart(30000)]);
  }

  async teardown() {
    // await dockerCompose.logs(['gateway', 'registry'], {cwd: __dirname, log: true});
    await dockerCompose.down({ cwd: __dirname, log: true });
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
