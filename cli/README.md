# cli

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/cli.svg)](https://npmjs.org/package/cli)
[![Downloads/week](https://img.shields.io/npm/dw/cli.svg)](https://npmjs.org/package/cli)
[![License](https://img.shields.io/npm/l/cli.svg)](https://github.com/Soluto/agogos/blob/master/package.json)

<!-- toc -->

-   [cli](#cli)
-   [Usage](#usage)
-   [Commands](#commands)
    <!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g stitch-cli
$ stitch COMMAND
running command...
$ stitch (-v|--version|version)
stitch-cli/0.0.5 darwin-x64 node-v13.7.0
$ stitch --help [COMMAND]
USAGE
  $ stitch COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

-   [`stitch apply:resources FILEORDIRECTORY`](#stitch-applyresources-fileordirectory)
-   [`stitch help [COMMAND]`](#stitch-help-command)

## `stitch apply:resources FILEORDIRECTORY`

Apply resources

```
USAGE
  $ stitch apply:resources FILEORDIRECTORY

OPTIONS
  --authorization-header=authorization-header  Custom authorization header
  --dry-run                                    Should perform a dry run
  --registry-url=registry-url                  (required) Url of the registry

EXAMPLE
  $ stitch apply:resources schema.gql
  Uploaded successfully!
```

_See code: [src/commands/apply/resources.ts](https://github.com/Soluto/agogos/blob/v0.0.5/src/commands/apply/resources.ts)_

## `stitch help [COMMAND]`

display help for stitch

```
USAGE
  $ stitch help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

<!-- commandsstop -->
