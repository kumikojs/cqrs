import { useEffect } from 'react';
import { useClient } from './ClientProvider';

import type {
  ClientContract,
  EventContract,
  EventHandlerFn,
} from '@stoik/cqrs-core';

export const useBaseEvent = <TEvent extends EventContract>(
  client: ClientContract,
  eventName: TEvent['eventName'],
  handler: EventHandlerFn<TEvent>
) => {
  useEffect(() => {
    const subscription = client.eventBus.on(eventName, handler);

    return subscription.off;
  }, [client, eventName, handler]);
};

export function useEvent<TEvent extends EventContract>(
  eventName: TEvent['eventName'],
  handler: EventHandlerFn<TEvent>
) {
  const client = useClient();

  return useBaseEvent(client, eventName, handler);
}
