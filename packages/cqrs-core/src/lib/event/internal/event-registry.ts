import type { VoidFunction } from '../../internal/types';
import type { EventContract, EventName } from '../event';
import type { EventHandlerContract } from '../event-handler';

export interface EventRegistryContract<
  BaseEvent extends EventContract = EventContract
> {
  register<TEvent extends BaseEvent>(
    eventName: string,
    handler: EventHandlerContract<TEvent>
  ): VoidFunction;

  resolve(eventName: string): EventHandlerContract<BaseEvent>;

  clear(): void;
}

export class EventRegistry implements EventRegistryContract {
  #handlers: Map<EventName, EventHandlerContract>;

  constructor() {
    this.#handlers = new Map();
  }

  public register<TEvent extends EventContract>(
    eventName: EventName,
    handler: EventHandlerContract<TEvent>
  ): VoidFunction {
    if (this.#handlers.has(eventName)) {
      throw new Error(`Event handler for "${eventName}" is already registered`);
    }

    this.#handlers.set(eventName, handler);

    return () => this.#handlers.delete(eventName);
  }

  public resolve(eventName: EventName): EventHandlerContract {
    const handler = this.#handlers.get(eventName);
    if (!handler) {
      throw new Error(`Event handler for "${eventName}" is not registered`);
    }

    return handler;
  }

  public clear(): void {
    this.#handlers.clear();
  }
}
