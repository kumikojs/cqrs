import type { EventContract, EventName } from './event';
import type { EventHandlerContract } from './event-handler';
import {
  EventRegistry,
  type EventRegistryContract,
} from './internal/event-registry';

/**
 * Export internal Exception classes
 * because they are used in the public API
 */
export { EventNotRegisteredException } from './internal/event-registry';

type EventHandlerFn<
  T extends EventContract = EventContract,
  TResponse = unknown
> = (event: T) => Promise<TResponse>;

type Subscription = {
  off: VoidFunction;
};

export interface EventBusContract<
  BaseEvent extends EventContract = EventContract
> {
  on<TEvent extends BaseEvent>(
    eventName: EventName,
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ): Subscription;

  emit<TEvent extends EventContract>(event: TEvent): Promise<void>;
}

export class EventBus implements EventBusContract {
  #eventRegistry: EventRegistryContract;

  constructor({
    registry = new EventRegistry(),
  }: {
    registry?: EventRegistryContract;
  } = {}) {
    this.#eventRegistry = registry;
  }

  on<TEvent extends EventContract>(
    eventName: EventName,
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ) {
    if (typeof handler === 'function') {
      handler = {
        handle: handler,
      };
    }

    return { off: this.#eventRegistry.register(eventName, handler) };
  }

  async emit<TEvent extends EventContract>(event: TEvent): Promise<void> {
    const handler = this.#eventRegistry.resolve(event.eventName);

    handler.forEach((h) => {
      h.handle(event);
    });
  }
}
