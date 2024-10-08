import { KumikoClient } from '@kumiko/core';
import { useBaseEventListener } from './useBaseEventListener';

import type {
  Event,
  EventHandlerOrFunction,
  ExtractEventByName,
  ExtractEvents,
  Feature,
  FeatureToSchema,
  MergedFeatureSchema,
} from '@kumiko/core/types';

export function useEventListener<FeatureList extends Feature[] = Feature[]>(
  client: KumikoClient<FeatureList>
) {
  type FeatureSchemaList = FeatureToSchema<FeatureList[number]>[];
  type KnownEvents = ExtractEvents<MergedFeatureSchema<FeatureSchemaList>>;

  function useEventListener<EventName extends keyof KnownEvents & string>(
    eventName: EventName,
    handler: EventHandlerOrFunction<ExtractEventByName<KnownEvents, EventName>>
  ): ReturnType<
    typeof useBaseEventListener<ExtractEventByName<KnownEvents, EventName>>
  >;
  function useEventListener<
    EventType extends Event = KnownEvents[keyof KnownEvents]
  >(
    eventName: EventType['eventName'] & string,
    handler: EventHandlerOrFunction<EventType>
  ): ReturnType<typeof useBaseEventListener<EventType>>;

  function useEventListener<EventType extends Event>(
    eventName: EventType['eventName'] & string,
    handler: EventHandlerOrFunction<EventType>
  ) {
    return useBaseEventListener(client, eventName, handler);
  }

  return useEventListener;
}
