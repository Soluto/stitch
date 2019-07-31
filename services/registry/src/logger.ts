import * as pino from "pino";
import * as pinoExpress from "express-pino-logger";

const logger = process.env.NODE_ENV === "production" ?
    pino() :
    pino({
        prettyPrint: {
            colorize: true,
            translateTime: "HH:MM:ss",
        },
    });


export const loggingMiddleware = pinoExpress({
    logger,
});

export default logger;