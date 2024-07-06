import {
  StoikLogger,
  type StoikLoggerOptions,
} from '../utilities/logger/stoik_logger';
import type { CommandRegistry } from './core/command';
import type { EventRegistry } from './core/event';
import type { ResilienceBuilderOptions } from './core/options/resilience_options';
import type { QueryCacheOptions, QueryRegistry } from './core/query';
import type { UnionToIntersection } from './helpers';

export type * from './core/command';
export type * from './core/event';
export type * from './core/query';
export type * from './infrastructure/interceptor';
export type * from './infrastructure/storage';

export type ClientOptions = NonNullable<
  Partial<{
    command: ResilienceBuilderOptions;
    query: ResilienceBuilderOptions;
    logger: StoikLoggerOptions | StoikLogger;
  }>
> & {
  cache: QueryCacheOptions;
};

export type Module<T extends BaseModule> = T;

export type Combined<T extends BaseModule[]> = UnionToIntersection<T[number]>;

export type BaseModule = {
  commands?: CommandRegistry;
  queries?: QueryRegistry;
  events?: EventRegistry;
};
