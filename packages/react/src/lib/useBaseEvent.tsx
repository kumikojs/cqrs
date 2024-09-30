/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

import { KumikoClient } from '@kumiko/core';
import type { Event, EventHandlerOrFunction } from '@kumiko/core/types';

export const useBaseEvent = <TEvent extends Event>(
  client: KumikoClient<any, any>,
  eventName: TEvent['eventName'],
  handler: EventHandlerOrFunction<TEvent>
) => {
  useEffect(() => {
    const subscription = client.event.on(eventName, handler);

    return subscription;
  }, [client, eventName, handler]);
};
