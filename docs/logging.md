# Logging

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
