import type { QueryCacheOptions } from '../core/query/query_cache';
import type { StoikLoggerOptions } from '../utilities/logger/stoik_logger';
import type { CommandRegistry } from './core/command';
import type { EventRegistry } from './core/event';
import { ResilienceBuilderOptions } from './core/options/resilience_options';
import type { QueryRegistry } from './core/query';
import type { UnionToIntersection } from './helpers';

export type * from './helpers';
export type * from './infrastructure/bus';
export type * from './infrastructure/interceptor';
export type * from './infrastructure/storage';

export type ClientOptions = NonNullable<
  Partial<{
    cache: Partial<QueryCacheOptions>;
    command: ResilienceBuilderOptions;
    query: ResilienceBuilderOptions;
    logger: StoikLoggerOptions;
  }>
>;

export type Module<T extends BaseModule> = T;

export type Combined<T extends BaseModule[]> = UnionToIntersection<T[number]>;

export type BaseModule = {
  commands?: CommandRegistry;
  queries?: QueryRegistry;
  events?: EventRegistry;
};
