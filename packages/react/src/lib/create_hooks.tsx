/* eslint-disable @typescript-eslint/no-explicit-any */
import { KumikoClient } from '@kumiko/core';
import { useBaseCommand } from './useBaseCommand';
import { useBaseEventListener } from './useBaseEvent';
import { useBaseQuery } from './useBaseQuery';
import { useBaseSignal } from './useBaseSignal';

import type {
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
  ExtractQuery,
  Feature,
  FeatureToSchema,
  GetEventByName,
  MergedFeatureSchema,
  PreparedQueryInput,
  QueryHandler,
  QueryProcessorFunction,
  ResolvedCommandRegistry,
} from '@kumiko/core/types';

import type { ExtendedQuery } from './types/query';

export function createHooks<FeatureList extends Feature[] = Feature[]>(
  client: KumikoClient<FeatureList>
) {
  type FeatureSchemaList = FeatureToSchema<FeatureList[number]>[];
  type KnownCommands = ExtractCommands<MergedFeatureSchema<FeatureSchemaList>>;
  type KnownQueries = ExtractQueries<MergedFeatureSchema<FeatureSchemaList>>;
  type KnownEvents = ExtractEvents<MergedFeatureSchema<FeatureSchemaList>>;

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
  ): ReturnType<typeof useBaseCommand<CommandType>> {
    return useBaseCommand(client, command, handler as CommandExecutorFunction);
  }

  function useQuery<
    TQueryInput extends PreparedQueryInput<
      KnownQueries[keyof KnownQueries],
      KnownQueries
    >,
    QueryType extends ExtendedQuery = ExtractQuery<
      KnownQueries,
      TQueryInput['queryName']
    >
  >(
    query:
      | TQueryInput
      | (PreparedQueryInput<QueryType, KnownQueries> & {
          options: { runOnMount: boolean };
        }),
    handler?: QueryProcessorFunction<QueryType> | QueryHandler<QueryType>
  ): ReturnType<typeof useBaseQuery<QueryType>>;
  function useQuery<QueryType extends ExtendedQuery>(
    query: PreparedQueryInput<QueryType, KnownQueries>,
    handler?: QueryHandler<QueryType>
  ): ReturnType<typeof useBaseQuery<QueryType>>;
  function useQuery<QueryType extends ExtendedQuery>(
    query: QueryType['req'],
    handler?: QueryHandler<QueryType>
  ) {
    return useBaseQuery(client, query, handler);
  }

  function useSignal<EventNameOrType extends keyof KnownEvents | Event>(
    eventName: EventNameOrType extends keyof KnownEvents & string
      ? EventNameOrType
      : EventNameOrType extends Event
      ? EventNameOrType['eventName']
      : never,
    initialState?: EventNameOrType extends keyof KnownEvents & string
      ? GetEventByName<KnownEvents, EventNameOrType>['payload']
      : EventNameOrType extends Event
      ? EventNameOrType['payload']
      : never
  ): ReturnType<
    typeof useBaseSignal<
      EventNameOrType extends keyof KnownEvents & string
        ? GetEventByName<KnownEvents, EventNameOrType>
        : EventNameOrType extends Event
        ? EventNameOrType
        : never
    >
  >;

  function useSignal<EventType extends Event>(
    eventName: EventType['eventName'],
    initialState?: EventType['payload']
  ) {
    return useBaseSignal(client.event, eventName, initialState);
  }

  function useEventListener<EventName extends keyof KnownEvents & string>(
    eventName: EventName,
    handler: EventHandlerOrFunction<GetEventByName<KnownEvents, EventName>>
  ): ReturnType<
    typeof useBaseEventListener<GetEventByName<KnownEvents, EventName>>
  >;
  function useEventListener<
    EventType extends Event = KnownEvents[keyof KnownEvents]
  >(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): ReturnType<typeof useBaseEventListener<EventType>>;
  function useEventListener<
    EventType extends Event = KnownEvents[keyof KnownEvents]
  >(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ) {
    return useBaseEventListener(client, eventName, handler);
  }

  return {
    useCommand,
    useEventListener,
    useQuery,
    useSignal,
  };
}
