import process from 'process';
import logger from './logger';

type DisposeFn = () => Promise<void> | void;

export function handleUncaughtErrors() {
    process.on('uncaughtException', (error: any) => {
        logger.fatal({error}, 'Uncaught exception caught in global handler');
        process.exit(1);
    });

    process.on('unhandledRejection', (error: any) => {
        logger.fatal({error}, 'Unhandled promise rejection caught in global handler');
        process.exit(1);
    });
}

export function handleSignals(dispose: DisposeFn) {
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, async () => {
            await dispose();
            process.exit();
        });
    }
}
