import { Logger } from './logger';

import type { LoggerOptions } from './logger';

const Topics = [
  // Main topics
  'command',
  'query',
  'event',

  // Secondary topics
  'resilience',

  // Internal topics
  'bus',
  'cache',
  'interceptors',
] as const;
type Topics = typeof Topics;
type LoggerTopics = (typeof Topics)[number];

export type AesopLoggerOptions = Omit<LoggerOptions<LoggerTopics[]>, 'topics'>;

export function logger(config?: AesopLoggerOptions): AesopLogger {
  return new AesopLogger(config);
}

export class AesopLogger extends Logger<LoggerTopics[]> {
  constructor(config?: AesopLoggerOptions) {
    super(config);
  }
}
