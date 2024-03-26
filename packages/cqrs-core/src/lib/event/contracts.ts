/**
 * @module event
 */
import type { Nullable } from '../types';

/**
 * The event contract defines the structure of an event.
 *
 * @template TName - The name of the event.
 * @template TPayload - The optional payload data associated with the event.
 * @example
 * ```ts
 * import type { EventContract } from '@stoik/cqrs-core';
 *
 * type UserCreatedEvent = EventContract<'user.created', { id: number; name: string; }>;
 * ```
 */
export interface EventContract<
  TName extends string = string,
  TPayload = unknown
> {
  /**
   * The unique name of the event.
   */
  eventName: TName;

  /**
   * The optional payload data associated with the event.
   */
  payload?: Nullable<TPayload>;
}

/**
 * The event handler contract defines the structure of an event handler.
 *
 * @template TEvent - The type of event the handler accepts, extending {@link EventContract}.
 * @example
 * ```ts
 * import type { EventContract, EventHandlerContract } from '@stoik/cqrs-core';
 *
 * type UserCreatedEvent = EventContract<'user.created', { id: number; name: string; }>;
 * type UserUpdatedEvent = EventContract<'user.updated', { id: number; name: string; }>;
 *
 * const userCreatedHandler: EventHandlerContract<UserCreatedEvent> = {
 *  async handle(event) {
 *    console.log('User created:', event.payload);
 *  },
 * };
 *
 * class UserUpdatedHandler implements EventHandlerContract<UserUpdatedEvent> {
 *  async handle(event) {
 *    console.log('User updated:', event.payload);
 *  }
 * }
 * ```
 */
export interface EventHandlerContract<
  TEvent extends EventContract = EventContract
> {
  /**
   * Handles the given event.
   *
   * @param event - The event to handle.
   */
  handle(event: TEvent): Promise<void>;
}

/**
 * The event bus contract defines the structure of an event bus.
 *
 * @template KnownEvents - A record of known event types.
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
export interface EventBusContract<
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> {
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
  ): VoidFunction;

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
  ): void;

  /**
   * Emit an event.
   *
   * @template TEvent - The type of event to emit.
   * @param event - The event to emit.
   */
  emit<TEvent extends KnownEvents[keyof KnownEvents]>(
    event: TEvent
  ): Promise<void>;
}
