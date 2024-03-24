import { MemoryBusDriver } from '../bus/drivers/memory_bus';

import type { BusDriver } from '../bus/bus_driver';
import type {
  EventBusContract,
  EventContract,
  EventHandlerContract,
} from './contracts';
import type { EventHandlerFn } from './types';

export class EventBus<KnownEvents extends Record<string, EventContract>>
  implements EventBusContract<KnownEvents>
{
  #driver: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
  });

  on<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ) {
    if (typeof handler === 'function') {
      this.#driver.subscribe(eventName, handler);
    } else {
      this.#driver.subscribe(eventName, handler.handle);
    }

    return () => this.off(eventName, handler);
  }

  off<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ) {
    if (typeof handler === 'function') {
      this.#driver.unsubscribe(eventName, handler);
    } else {
      this.#driver.unsubscribe(eventName, handler.handle);
    }
  }

  async emit<TEvent extends KnownEvents[keyof KnownEvents]>(event: TEvent) {
    this.#driver.publish(event.eventName, event);
  }
}
