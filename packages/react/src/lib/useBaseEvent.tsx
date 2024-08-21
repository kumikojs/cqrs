/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

import { Aesop } from '@aesop/core';
import type { Event, EventHandlerOrFunction } from '@aesop/core/types';

export const useBaseEvent = <TEvent extends Event>(
  client: Aesop<any>,
  eventName: TEvent['eventName'],
  handler: EventHandlerOrFunction<TEvent>
) => {
  useEffect(() => {
    const subscription = client.event.on(eventName, handler);

    return subscription;
  }, [client, eventName, handler]);
};
