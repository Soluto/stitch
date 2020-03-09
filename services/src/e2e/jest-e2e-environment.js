const NodeEnvironment = require('jest-environment-node');
const dockerCompose = require('docker-compose');
const waitFor = require('./waitFor');

const sleep = timeout => new Promise(r => setTimeout(r, timeout));

class DockerComposeEnvironment extends NodeEnvironment {
    async setup() {
        await super.setup();
        await dockerCompose.restartAll({cwd: __dirname, log: true});
        await sleep(1000); // letting it go down before polling
        await Promise.all([waitFor.gatewayStart(10000), waitFor.registryStart(10000)]);
    }
}

module.exports = DockerComposeEnvironment;
