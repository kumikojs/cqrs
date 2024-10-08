import { KumikoClient } from '@kumiko/core';
import { useBaseSignal } from './useBaseSignal';

import type {
  Event,
  ExtractEventByName,
  ExtractEvents,
  Feature,
  FeatureToSchema,
  MergedFeatureSchema,
} from '@kumiko/core/types';

export function useSignal<FeatureList extends Feature[] = Feature[]>(
  client: KumikoClient<FeatureList>
) {
  type FeatureSchemaList = FeatureToSchema<FeatureList[number]>[];
  type KnownEvents = ExtractEvents<MergedFeatureSchema<FeatureSchemaList>>;

  function useSignal<EventName extends keyof KnownEvents & string>(
    eventName: EventName,
    initialState?: ExtractEventByName<KnownEvents, EventName>['payload']
  ): ReturnType<
    typeof useBaseSignal<
      ExtractEventByName<KnownEvents, EventName>,
      KnownEvents
    >
  >;
  function useSignal<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    initialState?: EventType['payload']
  ): ReturnType<typeof useBaseSignal<EventType, KnownEvents>>;

  function useSignal<EventType extends Event>(
    eventName: EventType['eventName'],
    initialState?: EventType['payload']
  ) {
    return useBaseSignal<EventType, KnownEvents>(
      client.event,
      eventName,
      initialState
    );
  }

  return useSignal;
}
