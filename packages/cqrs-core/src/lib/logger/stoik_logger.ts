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

export class StoikLogger extends Logger<LoggerTopics[]> {
  constructor(config: LoggerOptions<LoggerTopics[]>) {
    super(config);
  }
}

export function createStoikLogger(
  config: LoggerOptions<LoggerTopics[]>
): StoikLogger {
  return new StoikLogger(config);
}
