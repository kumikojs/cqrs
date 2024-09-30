/* eslint-disable @typescript-eslint/no-explicit-any */
import { KumikoClient } from '@kumiko/core';

import { useBaseCommand } from './useBaseCommand';
import { useBaseEvent } from './useBaseEvent';
import { useBaseQuery } from './useBaseQuery';

import type {
  ClientOptions,
  Command,
  CommandExecutorFunction,
  CommandForExecution,
  CommandHandlerWithContext,
  Event,
  EventHandlerOrFunction,
  ExtractCommands,
  ExtractEvents,
  ExtractFunction,
  ExtractQueries,
  Feature,
  FeatureToSchema,
  GetEventByName,
  MergedFeatureSchema,
  PreparedQueryInput,
  QueryProcessor,
  ResolvedCommandRegistry,
} from '@kumiko/core/types';

import type { ExtendedQuery } from './types/query';

export function create<FeatureList extends Feature[] = Feature[]>(
  options: ClientOptions
) {
  type FeatureSchemaList = FeatureToSchema<FeatureList[number]>[];
  type KnownCommands = ExtractCommands<MergedFeatureSchema<FeatureSchemaList>>;
  type KnownQueries = ExtractQueries<MergedFeatureSchema<FeatureSchemaList>>;
  type KnownEvents = ExtractEvents<MergedFeatureSchema<FeatureSchemaList>>;

  const client = new KumikoClient<FeatureList>(options);

  function useCommand<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    command: CommandForExecution<CommandType, KnownCommands, KnownQueries>,
    handler?: ExtractFunction<
      CommandHandlerWithContext<CommandType, KnownQueries, KnownEvents>
    >
  ) {
    return useBaseCommand(client, command, handler as CommandExecutorFunction);
  }

  function useEventListener<EventName extends keyof KnownEvents & string>(
    eventName: EventName,
    handler: EventHandlerOrFunction<GetEventByName<KnownEvents, EventName>>
  ): void;
  function useEventListener<
    EventType extends Event = KnownEvents[keyof KnownEvents]
  >(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ) {
    return useBaseEvent(client, eventName, handler);
  }

  function useQuery<
    TQuery extends ExtendedQuery = KnownQueries[keyof KnownQueries]
  >(
    query: PreparedQueryInput<TQuery, KnownQueries> | TQuery['req'],
    handler?: QueryProcessor<TQuery>
  ) {
    useBaseQuery<TQuery>(client, query, handler);
  }

  return {
    kumiko: client,
    useCommand,
    useEventListener,
    useQuery,
  };
}
