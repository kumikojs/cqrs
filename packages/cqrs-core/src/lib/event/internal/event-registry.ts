import type { VoidFunction } from '../../internal/types';
import type { EventContract } from '../event';
import type { EventHandlerContract } from '../event-handler';

export interface EventRegistryContract<
  BaseEvent extends EventContract = EventContract
> {
  register<TEvent extends BaseEvent>(
    eventName: string,
    handler: EventHandlerContract<TEvent>
  ): VoidFunction;

  resolve<TEvent extends BaseEvent>(
    eventName: TEvent['eventName']
  ): EventHandlerContract[];

  clear(): void;
}

export class EventNotRegisteredException extends Error {
  constructor(eventName: string) {
    super(`Event handler for "${eventName}" is not registered`);
  }
}

export class EventRegistry implements EventRegistryContract {
  #handlers: Map<EventContract['eventName'], EventHandlerContract[]>;

  constructor() {
    this.#handlers = new Map();
  }

  public register<TEvent extends EventContract>(
    eventName: TEvent['eventName'],
    handler: EventHandlerContract<TEvent>
  ): VoidFunction {
    if (!this.#handlers.has(eventName)) {
      this.#handlers.set(eventName, []);
    }

    this.#handlers.get(eventName)?.push(handler);

    return () => {
      const handlers = this.#handlers.get(eventName);
      if (!handlers) {
        return;
      }

      const index = handlers.indexOf(handler);
      if (index === -1) {
        return;
      }

      handlers.splice(index, 1);

      if (handlers.length === 0) {
        this.#handlers.delete(eventName);
      }
    };
  }

  public resolve<TEvent extends EventContract>(
    eventName: TEvent['eventName']
  ): EventHandlerContract[] {
    const handler = this.#handlers.get(eventName);

    if (!handler) {
      throw new EventNotRegisteredException(eventName);
    }

    return handler;
  }

  public clear(): void {
    this.#handlers.clear();
  }
}
