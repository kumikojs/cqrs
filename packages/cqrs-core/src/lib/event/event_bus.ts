/**
 * @module event
 */
import { MemoryBusDriver } from '../internal/bus/drivers/memory_bus';

import type { BusDriver } from '../internal/bus/bus_driver';
import type {
  EventBusContract,
  EventContract,
  EventHandlerContract,
} from './contracts';

/**
 * The EventBus is a simple event bus that allows you to register event handlers
 * and emit events.
 *
 * @template KnownEvents - A record of known event types for inference purposes.
 * @implements EventBusContract - The event bus contract. {@link EventBusContract}
 * @example
 * ```ts
 * import { type EventContract, EventBus } from '@stoik/cqrs-core';
 *
 * type UserCreatedEvent = EventContract<'user.created', { id: number; name: string; }>;
 * type UserUpdatedEvent = EventContract<'user.updated', { id: number; name: string; }>;
 *
 * type KnownEvents = {
 *  'user.created': UserCreatedEvent;
 *  'user.updated': UserUpdatedEvent;
 * };
 * const bus = new EventBus<KnownEvents>();
 *
 * bus.on('user.created', async (event) => {
 *  console.log('User created:', event);
 * });
 *
 * bus.emit({
 *  eventName: 'user.created',
 *  payload: {
 *    id: 1,
 *    name: 'John Doe',
 *  },
 * });
 * ```
 */
export class EventBus<KnownEvents extends Record<string, EventContract>>
  implements EventBusContract<KnownEvents>
{
  /**
   * The underlying bus driver.
   * This driver is responsible for managing the subscriptions and publishing of events.
   */
  #driver: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
  });

  /**
   * Subscribe to an event.
   *
   * @template TEvent - The type of event to subscribe to.
   * @param eventName - The name of the event to subscribe to.
   * @param handler - The event handler to subscribe.
   * @returns A function to unsubscribe from the event.
   */
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

  /**
   * Unsubscribe from an event.
   *
   * @template TEvent - The type of event to unsubscribe from.
   * @param eventName - The name of the event to unsubscribe from.
   * @param handler - The event handler to unsubscribe.
   */
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

  /**
   * Emit an event.
   *
   * @template TEvent - The type of event to emit.
   * @param event - The event to emit.
   */
  async emit<TEvent extends KnownEvents[keyof KnownEvents]>(event: TEvent) {
    this.#driver.publish(event.eventName, event);
  }
}
