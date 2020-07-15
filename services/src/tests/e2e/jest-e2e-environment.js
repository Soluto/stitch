const NodeEnvironment = require('jest-environment-node');
const dockerCompose = require('docker-compose');
const waitFor = require('./wait-for');

const sleep = timeout => new Promise(r => setTimeout(r, timeout));

const options = {
  cwd: __dirname,
  env: {
    COMPOSE_DOCKER_CLI_BUILD: '1',
    DOCKER_BUILDKIT: '1',
    PATH: process.env.PATH,
  },
  log: true,
};

class DockerComposeEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    await dockerCompose.restartAll(options);
    await sleep(1000); // letting it go down before polling
    await Promise.all([waitFor.gatewayStart(30000), waitFor.registryStart(30000)]);
  }
}

module.exports = DockerComposeEnvironment;
