/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

import { Stoik } from '@stoik/cqrs-core';
import type { Event, EventHandlerOrFunction } from '@stoik/cqrs-core/types';

export const useBaseEvent = <TEvent extends Event>(
  client: Stoik<any>,
  eventName: TEvent['eventName'],
  handler: EventHandlerOrFunction<TEvent>
) => {
  useEffect(() => {
    const subscription = client.event.on(eventName, handler);

    return subscription;
  }, [client, eventName, handler]);
};
