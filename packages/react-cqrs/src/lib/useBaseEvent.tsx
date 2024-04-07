import { useEffect } from 'react';
import { Client } from '@stoik/cqrs-core';

import type { EventContract, EventHandlerContract } from '@stoik/cqrs-core';

export const useBaseEvent = <TEvent extends EventContract>(
  client: Client,
  eventName: TEvent['eventName'],
  handler: EventHandlerContract<TEvent>['handle'] | EventHandlerContract<TEvent>
) => {
  useEffect(() => {
    const subscription = client.event.on(eventName, handler);

    return subscription;
  }, [client, eventName, handler]);
};
