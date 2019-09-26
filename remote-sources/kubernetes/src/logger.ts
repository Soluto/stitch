import * as pinoExpress from 'express-pino-logger';
import * as pino from 'pino';
import * as printer from 'pino-http-print';

const logger = process.env.NODE_ENV === 'production'
  ? pino({
    level: (process.env.LOG_LEVEL || 'WARN').toLowerCase()
  })
  : pino({
    level: (process.env.LOG_LEVEL || 'DEBUG').toLowerCase(),
    prettyPrint: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  });

export const loggingMiddleware = pinoExpress(printer());

export default logger;
