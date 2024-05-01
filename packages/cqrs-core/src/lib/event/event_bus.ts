import { MemoryBusDriver } from '../internal/bus/drivers/memory_bus';

import type { BusDriver } from '../internal/bus/bus_driver';
import type { VoidFunction } from '../types';
import type {
  EventEmitter,
  EventContract,
  EventHandlerContract,
} from './event_contracts';

/**
 * The `EventBus` class provides a simple mechanism for managing event subscriptions and publishing events within your application.
 *
 * @template KnownEvents - A record type representing known event types for type inference.
 *                         Keys are event names (strings), and values are the corresponding {@link EventContract} types.
 * @example
 * ```typescript
 * import { type EventContract, EventBus } from '@stoik/cqrs-core';
 *
 * type UserCreatedEvent = EventContract<'user.created', { id: number; name: string; }>;
 * type UserUpdatedEvent = EventContract<'user.updated', { id: number; name: string; }>;
 *
 * type KnownEvents = {
 *  'user.created': UserCreatedEvent;
 *  'user.updated': UserUpdatedEvent;
 * };
 *
 * const bus = new EventBus<KnownEvents>();
 *
 * // Subscribing to an event
 * bus.on('user.created', async (event) => {
 *  console.log('User created:', event);
 * });
 *
 * // Emitting an event
 * bus.emit({
 *  eventName: 'user.created',
 *  payload: {
 *    id: 1,
 *    name: 'John Doe',
 *  },
 * });
 * ```
 */
export class EventBus<
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> implements EventEmitter<KnownEvents>
{
  /**
   * The underlying bus driver instance responsible for handling event subscriptions and publishing.
   * The driver (`MemoryBusDriver`) manages the subscription storage and event delivery logic.
   */
  #driver: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
  });

  constructor() {
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.emit = this.emit.bind(this);
  }

  dispose(): void {
    this.#driver.clear();
  }

  /**
   * Subscribes to a specific event type within the event bus.
   *
   * @template TEvent - The type of event to subscribe to, inferred from the `KnownEvents` record.
   * @param eventName - The name of the event to subscribe to (typically a string literal).
   * @param handler - The event handler function or object implementing the {@link EventHandlerContract} interface.
   *                  The handler will be invoked whenever an event of the specified type is emitted.
   * @returns A function that can be used to unsubscribe from the event.
   */
  on<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler:
      | EventHandlerContract<TEvent>
      | EventHandlerContract<TEvent>['handle']
  ): VoidFunction {
    const handlerFn = typeof handler === 'function' ? handler : handler.handle;

    this.#driver.subscribe(eventName, handlerFn);

    return () => this.off(eventName, handler);
  }

  /**
   * Unsubscribes from a specific event type within the event bus.
   *
   * @template TEvent - The type of event to unsubscribe from, inferred from the `KnownEvents` record.
   * @param eventName - The name of the event to unsubscribe from.
   * @param handler - The same event handler function or object used during subscription.
   */
  off<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler:
      | EventHandlerContract<TEvent>
      | EventHandlerContract<TEvent>['handle']
  ): void {
    const handlerFn = typeof handler === 'function' ? handler : handler.handle;

    this.#driver.unsubscribe(eventName, handlerFn);
  }

  /**
   * Emits an event within the event bus, notifying all subscribed handlers.
   *
   * @template TEvent - The type of event to emit, inferred from the `KnownEvents` record.
   * @param event - The event object to be emitted. The event object must conform to the {@link EventContract} interface.
   *                It typically includes an `eventName` property and an optional `payload` property.
   * @returns A promise that resolves when the event has been published to all subscribed handlers.
   */
  async emit<TEvent extends KnownEvents[keyof KnownEvents]>(
    event: TEvent
  ): Promise<void> {
    await this.#driver.publish(event.eventName, event);
  }
}
