const child_process = require('child_process');
const process = require('process');

const source = child_process.spawn('./source-kubernetes-fs', {
    stdio: 'inherit',
    env: {
        PORT: '8003',
        RESOURCE_FOLDER: '/resources',
    },
});
source.NAME = 'kubernetes-fs-source';

const registry = child_process.spawn('/usr/local/bin/yarn', ['start'], {
    cwd: './registry',
    stdio: 'inherit',
    env: {
        PORT: '8001',
        GRPC_PORT: '8002',
        REMOTESOURCE__KUBERNETES_FS: 'http://localhost:8003',
    },
});
registry.NAME = 'registry';

const gateway = child_process.spawn('./gateway', {
    stdio: 'inherit',
    env: {
        PORT: '8000',
        REGISTRY_URL: 'localhost:8002',
    },
});
gateway.NAME = 'gateway';

function handleSubprocessSignal() {
    const childProcessName = this.NAME;
    console.log('error/exit signal from child process', childProcessName);
    console.log('signal args:', ...arguments);

    gateway.kill('SIGTERM');
    registry.kill('SIGTERM');
    source.kill('SIGTERM');
    process.exit(0);
}

gateway.once('exit', handleSubprocessSignal);
gateway.once('error', handleSubprocessSignal);

registry.once('exit', handleSubprocessSignal);
registry.once('error', handleSubprocessSignal);

source.once('exit', handleSubprocessSignal);
source.once('error', handleSubprocessSignal);

function handleTerminationSignals(signal) {
    console.log('Got signal from system -', signal);
    console.log('Exiting...');

    gateway.kill('SIGTERM');
    registry.kill('SIGTERM');
    source.kill('SIGTERM');
    process.exit(0);
}

process.once('SIGINT', handleTerminationSignals);
process.once('SIGTERM', handleTerminationSignals);
