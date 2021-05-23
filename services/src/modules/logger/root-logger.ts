import * as pino from 'pino';
import { logLevel, nodeEnv, loggerConfiguration } from '../config';

let logger: pino.Logger;

function getLogger() {
  if (logger) {
    return logger;
  }

  const loggerConfig: pino.LoggerOptions = {
    level: logLevel.toLowerCase(),
    timestamp: pino.stdTimeFunctions.unixTime,
    messageKey: 'message',
  };

  const devLoggerConfig: pino.LoggerOptions = {
    timestamp: true,
    prettyPrint: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
    },
  };

  logger = pino({
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

  return logger;
}

export default getLogger();
