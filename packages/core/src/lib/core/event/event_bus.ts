import { MemoryBusDriver } from '../../infrastructure/bus/drivers/memory_bus';
import { AesopLogger } from '../../utilities/logger/aesop_logger';

import type {
  EventEmitter,
  EventHandlerOrFunction,
  EventRegistry,
} from '../../types/core/event';
import type { BusDriver } from '../../types/infrastructure/bus';

/**
 * The `EventBus` class provides a mechanism for managing event subscriptions and publishing events within your application.
 *
 * @template KnownEvents - A record type representing known event types for type inference.
 *                          Keys are event names (strings), and values are the corresponding Event types.
 * @example
 * ```typescript
 * import { type Event, EventBus } from '@aesop/core';
 *
 * type UserCreatedEvent = Event<'user.created', { id: number; name: string; }>;
 * type UserUpdatedEvent = Event<'user.updated', { id: number; name: string; }>;
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
export class EventBus<KnownEvents extends EventRegistry = EventRegistry>
  implements EventEmitter<KnownEvents>
{
  /**
   * @private
   * The underlying bus driver instance responsible for handling event subscriptions and publishing.
   * The driver (`MemoryBusDriver`) manages the subscription storage and event delivery logic.
   */
  #driver: BusDriver<string>;

  /**
   * @private
   * Logger instance for logging event bus activities.
   */
  #logger: AesopLogger;

  /**
   * Constructs an EventBus instance.
   *
   * @param logger - The logger instance to be used for logging.
   */
  constructor(logger: AesopLogger) {
    this.#logger = logger.child({ topics: ['event'] });

    this.#driver = new MemoryBusDriver({
      maxHandlersPerChannel: Infinity,
      logger: this.#logger,
    });

    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.emit = this.emit.bind(this);
  }

  /**
   * Disconnects the event bus.
   */
  disconnect(): void {
    this.#driver.disconnect();
  }

  /**
   * Subscribes to a specific event type within the event bus.
   *
   * @template EventType - The type of event to subscribe to, inferred from the `KnownEvents` record.
   * @param eventName - The name of the event to subscribe to (typically a string literal).
   * @param handler - The event handler function or object implementing the {@link EventHandlerOrFunction} interface.
   *                  The handler will be invoked whenever an event of the specified type is emitted.
   * @returns A function that can be used to unsubscribe from the event.
   */
  on<EventType extends KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): VoidFunction {
    const handlerFn = typeof handler === 'function' ? handler : handler.handle;

    this.#driver.subscribe(eventName, handlerFn);

    return () => this.off(eventName, handler);
  }

  /**
   * Unsubscribes from a specific event type within the event bus.
   *
   * @template EventType - The type of event to unsubscribe from, inferred from the `KnownEvents` record.
   * @param eventName - The name of the event to unsubscribe from.
   * @param handler - The same event handler function or object used during subscription.
   */
  off<EventType extends KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): void {
    const handlerFn = typeof handler === 'function' ? handler : handler.handle;

    this.#driver.unsubscribe(eventName, handlerFn);
  }

  /**
   * Emits an event within the event bus, notifying all subscribed handlers.
   *
   * @template EventType - The type of event to emit, inferred from the `KnownEvents` record.
   * @param event - The event object to be emitted. The event object must conform to the {@link Event} interface.
   *                It typically includes an `eventName` property and an optional `payload` property.
   * @returns A promise that resolves when the event has been published to all subscribed handlers.
   */
  async emit<EventType extends KnownEvents[keyof KnownEvents]>(
    event: EventType
  ): Promise<void> {
    await this.#driver.publish(event.eventName, event);
  }
}
