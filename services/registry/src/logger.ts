import * as pinoExpress from "express-pino-logger";
import * as pino from "pino";
import * as  printer from "pino-http-print";


const logger = process.env.NODE_ENV === "production" ?
    pino({
        level: "warn",
    }) :
    pino({
        level: "debug",
        prettyPrint: {
            colorize: true,
            translateTime: "HH:MM:ss",
        },
    });

export const loggingMiddleware = pinoExpress(printer());

export default logger;