import { Logger } from 'pino';
import { childLoggerLevels, logLevel } from '../config';

export default function createChildLogger(logger: Logger, name: string, bindings?: Record<string, unknown>) {
  const level = childLoggerLevels[name] ?? logLevel.toLowerCase();
  return logger.child({ name, level, ...bindings });
}
