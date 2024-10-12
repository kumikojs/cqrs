import {
  KumikoLogger,
  type KumikoLoggerOptions,
} from '../utilities/logger/kumiko_logger';
import type { ResilienceBuilderOptions } from './core/options/resilience_options';
import type { QueryCacheOptions } from './core/query';

export type * from './core/command';
export type * from './core/event';
export type * from './core/feature';
export type * from './core/options/resilience_options';
export type * from './core/query';
export type * from './helpers';
export type * from './infrastructure/interceptor';
export type * from './infrastructure/storage';
export type * from './infrastructure/cache';

export type ClientOptions = {
  resilience?: {
    command?: ResilienceBuilderOptions;
    query?: ResilienceBuilderOptions;
  };
  logger?: KumikoLoggerOptions | KumikoLogger;
  cache: QueryCacheOptions;
};
