import { join } from 'path';
import * as dockerCompose from 'docker-compose';

const options: dockerCompose.IDockerComposeOptions = {
  cwd: join(__dirname, '../e2e'),
  env: {
    COMPOSE_DOCKER_CLI_BUILD: '1',
    DOCKER_BUILDKIT: '1',
    PATH: process.env.PATH,
  },
  log: true,
};

let output: string;

function capturingStdWrite(
  str: string | Uint8Array,
  encoding?: BufferEncoding | ((err?: Error) => void),
  cb?: (err?: Error) => void
) {
  const chunk =
    typeof str === 'string' ? str : Buffer.from(str).toString(typeof encoding === 'string' ? encoding : 'utf8');
  output += chunk;

  if (typeof encoding === 'string') {
    cb?.();
  } else {
    encoding?.();
  }
  return true;
}

export function startCaptureOutput() {
  const originalProcessStdoutWrite = process.stdout.write;
  const originalProcessStderrWrite = process.stderr.write;
  output = '';
  process.stdout.write = capturingStdWrite;
  process.stderr.write = capturingStdWrite;

  return function () {
    process.stdout.write = originalProcessStdoutWrite;
    process.stderr.write = originalProcessStderrWrite;
    return output;
  };
}

const startOutputCaptureMsg = '***** START OUTPUT CAPTURE *****';
const endOutputCaptureMsg = '***** END OUTPUT CAPTURE *****';
const command = `bash -c "/scripts/log-to-container.sh"`;

export async function startContainerOutputCapture(container: string) {
  await dockerCompose.exec(container, command, {
    ...options,
    commandOptions: ['-e', `MSG="${startOutputCaptureMsg}"`],
  });

  return async function () {
    await dockerCompose.exec(container, command, {
      ...options,
      commandOptions: ['-e', `MSG="${endOutputCaptureMsg}"`],
    });
    const endCaptureOutput = startCaptureOutput();
    await dockerCompose.logs(container, { ...options, commandOptions: ['--no-color'] });
    const result = endCaptureOutput();

    const startCapturePosition = result.lastIndexOf(startOutputCaptureMsg) + 1;
    const endCapturePosition = result.indexOf(endOutputCaptureMsg, startCapturePosition) + endOutputCaptureMsg.length;

    return (
      result
        .substring(startCapturePosition, endCapturePosition)
        .replace(/\[\d\d:\d\d:\d\d\.\d\d\d]/g, '[hh:mm:ss.ms]')
        .replace(/\n.+\| /g, '\n')
        // eslint-disable-next-line no-control-regex
        .replace(/\u001B[();?[]{0,2}(;?\d)*./g, '')
    );
  };
}
