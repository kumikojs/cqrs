import { KumikoClient } from '@kumiko/core';
import { useBaseEventListener } from './useBaseEvent';
import { useBaseQuery } from './useBaseQuery';
import { useBaseSignal } from './useBaseSignal';
import { useCommand } from './useCommand';

import type {
  Event,
  EventHandlerOrFunction,
  ExtractEventByName,
  ExtractEvents,
  ExtractQueries,
  Feature,
  FeatureToSchema,
  GetQueryByName,
  MergedFeatureSchema,
  PreparedQueryInput,
  QueryHandler,
} from '@kumiko/core/types';

import type { ExtendedQuery, OptionalQueryOptions } from './types/query';

export function createHooks<FeatureList extends Feature[] = Feature[]>(
  client: KumikoClient<FeatureList>
) {
  type FeatureSchemaList = FeatureToSchema<FeatureList[number]>[];
  type KnownQueries = ExtractQueries<MergedFeatureSchema<FeatureSchemaList>>;
  type KnownEvents = ExtractEvents<MergedFeatureSchema<FeatureSchemaList>>;

  function useQuery<
    QueryName extends keyof KnownQueries & string,
    QueryType extends ExtendedQuery = GetQueryByName<KnownQueries, QueryName>
  >(
    query: {
      queryName: QueryName;
      payload?: QueryType['req']['payload'];
      options?: PreparedQueryInput<QueryType, KnownQueries>['options'];
    } & OptionalQueryOptions,
    handler?: QueryHandler<QueryType>
  ): ReturnType<typeof useBaseQuery<QueryType>>;
  function useQuery<
    QueryType extends ExtendedQuery = KnownQueries[keyof KnownQueries]
  >(
    query: PreparedQueryInput<QueryType, KnownQueries> & OptionalQueryOptions,
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
      ? ExtractEventByName<KnownEvents, EventNameOrType>['payload']
      : EventNameOrType extends Event
      ? EventNameOrType['payload']
      : never
  ): ReturnType<
    typeof useBaseSignal<
      EventNameOrType extends keyof KnownEvents & string
        ? ExtractEventByName<KnownEvents, EventNameOrType>
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
    handler: EventHandlerOrFunction<ExtractEventByName<KnownEvents, EventName>>
  ): ReturnType<
    typeof useBaseEventListener<ExtractEventByName<KnownEvents, EventName>>
  >;
  function useEventListener<EventType extends Event>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): ReturnType<typeof useBaseEventListener<EventType>>;

  function useEventListener<EventType extends Event>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ) {
    return useBaseEventListener(client, eventName, handler);
  }

  return {
    useCommand: useCommand(client),
    useEventListener,
    useQuery,
    useSignal,
  };
}
