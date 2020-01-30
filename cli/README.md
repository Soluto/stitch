# cli

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/cli.svg)](https://npmjs.org/package/cli)
[![Downloads/week](https://img.shields.io/npm/dw/cli.svg)](https://npmjs.org/package/cli)
[![License](https://img.shields.io/npm/l/cli.svg)](https://github.com/Soluto/agogos/blob/master/package.json)

<!-- toc -->

-   [Usage](#usage)
-   [Commands](#commands)
    <!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g cli
$ stitch COMMAND
running command...
$ stitch (-v|--version|version)
cli/0.0.0 darwin-x64 node-v13.6.0
$ stitch --help [COMMAND]
USAGE
  $ stitch COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

-   [`stitch hello [FILE]`](#stitch-hello-file)
-   [`stitch help [COMMAND]`](#stitch-help-command)

## `stitch hello [FILE]`

describe the command here

```
USAGE
  $ stitch hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ stitch hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/Soluto/agogos/blob/v0.0.0/src/commands/hello.ts)_

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
