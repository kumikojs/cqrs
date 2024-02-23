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

type BindToSyntax<TEvent extends EventContract> = {
  to: (
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ) => VoidFunction;
};

export interface EventBusContract<
  BaseEvent extends EventContract = EventContract
> {
  bind<TEvent extends BaseEvent>(eventName: EventName): BindToSyntax<TEvent>;

  handle<TEvent extends EventContract>(event: TEvent): Promise<void>;
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

  bind<TEvent extends EventContract>(
    eventName: EventName
  ): BindToSyntax<TEvent> {
    return {
      to: (handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>) => {
        if (typeof handler === 'function') {
          handler = {
            handle: handler,
          };
        }

        return this.#eventRegistry.register(eventName, handler);
      },
    };
  }

  async handle<TEvent extends EventContract>(event: TEvent): Promise<void> {
    const handler = this.#eventRegistry.resolve(event.eventName);

    handler.forEach((h) => {
      h.handle(event);
    });
  }
}
