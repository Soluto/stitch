import * as process from 'process';
// import logger from './logger';

type DisposeFn = () => Promise<void> | void;

export function handleUncaughtErrors() {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught exception caught in global handler', error);
    // logger.fatal({error}, 'Uncaught exception caught in global handler');
    process.exit(1);
  });

  // eslint-disable-next-line @typescript-eslint/ban-types
  process.on('unhandledRejection', (reason: {} | null | undefined) => {
    console.error('Uncaught exception caught in global handler', reason);
    // logger.fatal({error}, 'Unhandled promise rejection caught in global handler');
    process.exit(1);
  });
}

export function handleSignals(dispose: DisposeFn) {
  for (const signal of ['SIGINT', 'SIGTERM'] as NodeJS.Signals[]) {
    process.on(signal, async () => {
      await dispose();
      process.exit();
    });
  }
}
