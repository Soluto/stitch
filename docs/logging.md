# Logging

## Configuration

Stitch uses [`pino`](https://github.com/pinojs/pino) logger. The logger default configuration can be found [here](../services/src/modules/logger.ts).

Custom configuration can be provided using `LOGGER_CONFIGURATION` environment variable.

> Note: environment variable value should be JSON-serialized object of [`pino.LoggerOptions`](https://getpino.io/#/docs/api?id=options-object) type. Properties of `function` type aren't supported.

Example:

```yaml
LOGGER_CONFIGURATION: |
  {
    "redact": [
      "err.request.headers.authorization"
    ]
  }
```

## Logging levels

Stitch log level can be set using `LOG_LEVEL` environment variable. The levels are `trace`, `debug`, `info`, `warn`, `error`, and `fatal`. The default log level is `warn`.

Additionally there is option to set different log levels for every module. It can be done using `CHILD_LOGGERS_LEVELS` environment variable.

In the example:

```json
{
  "policies-directive": "debug"
}
```

In this case the logger in the [`policies.ts`](../services/src/modules/directives/policy/policies.ts) module will log all that is `debug` level or above. All other modules will log on the level defined by `LOG_LEVEL` environment variable.

### Existing module loggers

- request
- opa-rego-compiler
- auth-strategy-api-key
- auth-strategy-jwt
- policies-directive
- policy-directive
- policy-query-directive
- policy-executor
- policy-argument-evaluator
