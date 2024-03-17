import { EventRegistry } from './internal/event-registry';

import type { EventContract } from './event';
import type { EventHandlerContract, EventHandlerFn } from './event-handler';
import type { EventRegistryContract } from './internal/event-registry';

/**
 * Export internal Exception classes
 * because they are used in the public API
 */
export { EventNotRegisteredException } from './internal/event-registry';

type Subscription = {
  off: VoidFunction;
};

export interface EventBusContract<
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> {
  on<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ): Subscription;

  emit<TEvent extends KnownEvents[keyof KnownEvents]>(
    event: TEvent
  ): Promise<void>;
}

export class EventBus<KnownEvents extends Record<string, EventContract>>
  implements EventBusContract<KnownEvents>
{
  #eventRegistry: EventRegistryContract<KnownEvents> =
    new EventRegistry<KnownEvents>();

  on<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ) {
    if (typeof handler === 'function') {
      handler = {
        handle: handler,
      };
    }

    return { off: this.#eventRegistry.register(eventName, handler) };
  }

  async emit<TEvent extends KnownEvents[keyof KnownEvents]>(event: TEvent) {
    const handler = this.#eventRegistry.resolve(event.eventName);

    handler.forEach((h) => {
      h.handle(event);
    });
  }
}
