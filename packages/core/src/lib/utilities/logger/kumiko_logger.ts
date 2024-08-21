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

export type KumikoLoggerOptions = Omit<LoggerOptions<LoggerTopics[]>, 'topics'>;

export function logger(config?: KumikoLoggerOptions): KumikoLogger {
  return new KumikoLogger(config);
}

export class KumikoLogger extends Logger<LoggerTopics[]> {
  constructor(config?: KumikoLoggerOptions) {
    super(config);
  }
}
