import * as pino from 'pino';
import {logLevel, nodeEnv} from './config';

const loggerConfig: pino.LoggerOptions = {
    level: logLevel.toLowerCase(),
    messageKey: 'message',
};

const devLoggerConfig: pino.LoggerOptions = {
    level: 'debug',
    prettyPrint: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
    },
};

export default pino({...loggerConfig, ...(nodeEnv !== 'production' ? devLoggerConfig : {})});
