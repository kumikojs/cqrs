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

export type StoikLoggerOptions = Omit<LoggerOptions<LoggerTopics[]>, 'topics'>;

export function logger(config?: StoikLoggerOptions): StoikLogger {
  return new StoikLogger(config);
}

export class StoikLogger extends Logger<LoggerTopics[]> {
  constructor(config?: StoikLoggerOptions) {
    super(config);
  }
}
