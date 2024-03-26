import { MemoryBusDriver } from '../internal/bus/drivers/memory_bus';

import type { BusDriver } from '../internal/bus/bus_driver';
import type {
  EventBusContract,
  EventContract,
  EventHandlerContract,
} from './contracts';

export class EventBus<KnownEvents extends Record<string, EventContract>>
  implements EventBusContract<KnownEvents>
{
  #driver: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
  });

  on<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler:
      | EventHandlerContract<TEvent>
      | EventHandlerContract<TEvent>['handle']
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
    handler:
      | EventHandlerContract<TEvent>
      | EventHandlerContract<TEvent>['handle']
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
