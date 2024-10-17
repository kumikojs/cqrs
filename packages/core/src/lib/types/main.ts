/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  KumikoLogger,
  type KumikoLoggerOptions,
} from '../utilities/logger/kumiko_logger';
import type { Command } from './core/command';
import type {
  RetryOptions,
  ThrottleOptions,
  TimeoutOptions,
} from './core/options/resilience_options';
import type { QueryCacheOptions, QueryInput } from './core/query';

export type * from './core/command';
export type * from './core/event';
export type * from './core/feature';
export type * from './core/options/resilience_options';
export type * from './core/query';
export type * from './helpers';
export type * from './infrastructure/cache';
export type * from './infrastructure/interceptor';
export type * from './infrastructure/storage';

export type CommandDefaultHandler = (
  request: Command<string, any, any>
) => Awaited<void>;
export type QueryDefaultHandler = (
  request: QueryInput<string, any, any>
) => Awaited<any>;

export type ClientOptions = {
  resilience?: {
    command?: {
      timeout?: TimeoutOptions['timeout'];
      throttle?: Omit<Partial<ThrottleOptions>, 'serialize'>;
      retry?: Partial<RetryOptions>;
      defaultHandler?: CommandDefaultHandler;
    };
    query?: {
      timeout?: TimeoutOptions['timeout'];
      throttle?: Omit<Partial<ThrottleOptions>, 'serialize'>;
      retry?: Partial<RetryOptions>;
      defaultHandler?: QueryDefaultHandler;
    };
  };
  logger?: KumikoLoggerOptions | KumikoLogger;
  cache: QueryCacheOptions;
};
