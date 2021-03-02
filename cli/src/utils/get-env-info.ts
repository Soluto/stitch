import { IConfig } from '@oclif/config';

export default function (config: IConfig, command: string, registryUrl: string, authorizationHeader = '') {
  const printableAuthHeader = authorizationHeader
    .split(' ')
    .map(w =>
      w
        .split('')
        .map((ch, idx) => (idx > 3 && idx < w.length - 3 ? '*' : ch))
        .join('')
    )
    .join(' ');

  return `
    Name:           ${config.name}
    Version:        ${config.version}
    Command:        ${command}
    Root directory: ${config.root}
    User agent:     ${config.userAgent}
    Platform:       ${config.platform}
    Architecture:   ${config.arch}
    Shell:          ${config.shell}
    CWD:            ${process.cwd()}

    RegistryUrl:    ${registryUrl}
    Authorization:  ${printableAuthHeader}

  `;
}
