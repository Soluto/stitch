import * as pino from 'pino';
import { logLevel, nodeEnv, loggerConfiguration } from './config';

const loggerConfig: pino.LoggerOptions = {
  level: logLevel.toLowerCase(),
  timestamp: pino.stdTimeFunctions.unixTime,
  messageKey: 'message',
};

const devLoggerConfig: pino.LoggerOptions = {
  level: 'trace',
  prettyPrint: {
    colorize: true,
    translateTime: 'HH:MM:ss.l',
    ignore: 'pid,hostname',
  },
};

export default pino({
  ...loggerConfig,
  ...(nodeEnv !== 'production' ? devLoggerConfig : {}),
  ...loggerConfiguration,
});
