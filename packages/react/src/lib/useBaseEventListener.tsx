/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

import { KumikoClient } from '@kumiko/core';
import type {
  Event,
  EventHandlerOrFunction,
  Feature,
} from '@kumiko/core/types';

export const useBaseEventListener = <
  TEvent extends Event,
  FeatureList extends Feature[] = Feature[]
>(
  client: KumikoClient<FeatureList>,
  eventName: TEvent['eventName'],
  handler: EventHandlerOrFunction<TEvent>
) => {
  useEffect(() => {
    const subscription = client.event.on(eventName, handler);

    return subscription;
  }, [client, eventName, handler]);
};
