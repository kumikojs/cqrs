import { useEffect } from 'react';

import type {
  ClientContract,
  EventContract,
  EventHandlerContract,
} from '@stoik/cqrs-core';

export const useBaseEvent = <TEvent extends EventContract>(
  client: ClientContract,
  eventName: TEvent['eventName'],
  handler: EventHandlerContract<TEvent>['handle'] | EventHandlerContract<TEvent>
) => {
  useEffect(() => {
    const subscription = client.eventBus.on(eventName, handler);

    return subscription;
  }, [client, eventName, handler]);
};
