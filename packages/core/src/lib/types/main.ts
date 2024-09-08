import {
  KumikoLogger,
  type KumikoLoggerOptions,
} from '../utilities/logger/kumiko_logger';
import type { Command, CommandRegistry } from './core/command';
import type { Event, EventRegistry } from './core/event';
import type { ResilienceBuilderOptions } from './core/options/resilience_options';
import type {
  QueryCacheOptions,
  Query,
  QueryRegistry,
} from './core/query';
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
    logger: KumikoLoggerOptions | KumikoLogger;
  }>
> & {
  cache: QueryCacheOptions;
};

export type ModuleWrapper<T extends ModuleSchema> = T;

export type MergedModuleSchema<T extends ModuleSchema[]> = UnionToIntersection<
  T[number]
>;

export type ModuleSchema = {
  commands?: CommandRegistry;
  queries?: QueryRegistry;
  events?: EventRegistry;
};

export type ModuleBlueprint = {
  commands?: Command[];
  events?: Event[];
  queries?: Query[];
};

export type BlueprintToModuleMap<T extends ModuleBlueprint> =
  T extends ModuleBlueprint
    ? {
        commands: T['commands'] extends Command[]
          ? {
              [K in T['commands'][number]['commandName']]: Extract<
                T['commands'][number],
                Command<K>
              >;
            }
          : CommandRegistry;
        events: T['events'] extends Event[]
          ? {
              [K in T['events'][number]['eventName']]: Extract<
                T['events'][number],
                Event<K>
              >;
            }
          : EventRegistry;
        queries: T['queries'] extends Query[]
          ? {
              [K in Extract<
                T['queries'][number]['req'],
                { queryName: string }
              >['queryName']]: Extract<
                T['queries'][number],
                Query<{ queryName: K }, unknown>
              >;
            }
          : QueryRegistry;
      }
    : {
        commands: CommandRegistry;
        events: EventRegistry;
        queries: QueryRegistry;
      };
