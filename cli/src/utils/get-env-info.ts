import { IConfig } from '@oclif/config';

export default function (config: IConfig, command: string) {
  return `
    Name:           ${config.name}
    Version:        ${config.version}
    Command:        ${command}
    Root directory: ${config.root}
    User agent:     ${config.userAgent}
    Platform:       ${config.platform}
    Architecture:   ${config.arch}
    Shell:          ${config.shell}
  `;
}
