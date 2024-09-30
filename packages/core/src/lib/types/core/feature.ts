import type { UnionToIntersection } from '../helpers';
import type { Command, CommandRegistry } from './command';
import type { Event, EventRegistry } from './event';
import type { Query, QueryRegistry } from './query';

export type MergedFeatureSchema<T extends FeatureSchema[]> =
  UnionToIntersection<T[number]>;

export type FeatureSchema = {
  commands: CommandRegistry;
  queries: QueryRegistry;
  events: EventRegistry;
};

export type Feature<
  T extends {
    commands: Command[];
    events: Event[];
    queries: Query[];
  } = {
    commands: Command[];
    events: Event[];
    queries: Query[];
  }
> = {
  commands: T['commands'];
  events: T['events'];
  queries: T['queries'];
};

export type FeatureToSchema<T extends Feature> = {
  commands: {
    [K in T['commands'][number]['commandName']]: Extract<
      T['commands'][number],
      Command<K>
    >;
  };
  events: {
    [K in T['events'][number]['eventName']]: Extract<
      T['events'][number],
      Event<K>
    >;
  };
  queries: {
    [K in Extract<
      T['queries'][number]['req'],
      { queryName: string }
    >['queryName']]: Extract<
      T['queries'][number],
      Query<{ queryName: K }, unknown>
    >;
  };
};

export type ExtractCommands<T> = T extends { commands: CommandRegistry }
  ? T['commands']
  : CommandRegistry;

export type ExtractEvents<T> = T extends { events: EventRegistry }
  ? T['events']
  : EventRegistry;

export type ExtractQueries<T> = T extends { queries: QueryRegistry }
  ? T['queries']
  : QueryRegistry;
