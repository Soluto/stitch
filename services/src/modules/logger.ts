import * as pino from 'pino';
import { logLevel, nodeEnv, loggerConfiguration } from './config';

const loggerConfig: pino.LoggerOptions = {
  level: logLevel.toLowerCase(),
  timestamp: pino.stdTimeFunctions.unixTime,
  messageKey: 'message',
};

const devLoggerConfig: pino.LoggerOptions = {
  level: 'trace',
  timestamp: true,
  prettyPrint: {
    colorize: true,
    translateTime: 'HH:MM:ss.l',
    ignore: 'pid,hostname',
  },
};

const logger = pino({
  ...loggerConfig,
  ...(nodeEnv !== 'production' ? devLoggerConfig : {}),
  ...loggerConfiguration,
});

const level = logger.level;
if (level === 'trace' || level === 'debug') {
  logger.warn(`
    ************************************************************************
      !!!LOGGER LEVEL IS "${level}" - SOME SENSITIVE DATA MIGHT BE PRINTED!!!
    ************************************************************************
  `);
}

export default logger;
