import type { Maybe } from '../helpers';

/**
 * Represents an event.
 * An occurrence or happening within the application domain.
 *
 * @template Name - The unique name of the event, typically a string literal.
 * @template Payload - The optional payload data associated with the event, providing additional context or information.
 * @example
 * ```typescript
 * import type { Event } from '@aesop/core';
 *
 * type UserCreatedEvent = Event<'user.created', { id: number; name: string; }>;
 * ```
 */
export interface Event<Name extends string = string, Payload = unknown> {
  /**
   * The unique name of the event that serves as an identifier.
   */
  eventName: Name;

  /**
   * The optional payload data associated with the event, potentially containing details about the occurrence.
   */
  payload: Maybe<Payload>;
}

/**
 * Represents a handler for a specific event type.
 * A function or class responsible for handling an event.
 *
 * @template EventType - The type of event the handler accepts, extending the {@link Event} interface.
 * @example
 * ```typescript
 * import type { Event, EventHandler } from '@aesop/core';
 *
 * type UserCreatedEvent = Event<'user.created', { id: number; name: string; }>;
 *
 * // Function-based handler
 * const userCreatedHandler: EventHandler<UserCreatedEvent> = async (event) => {
 *   console.log('User created:', event.payload);
 * };
 *
 * // Class-based handler
 * class UserUpdatedHandler implements EventHandler<UserUpdatedEvent> {
 *   async handle(event: UserUpdatedEvent) {
 *     console.log('User updated:', event.payload);
 *   }
 * }
 * ```
 */
export interface EventHandler<EventType extends Event = Event> {
  /**
   * Handles the given event.
   *
   * @param event - The event to handle.
   * @returns A promise resolving to `void` as event handling typically doesn't return a specific value.
   */
  handle(event: EventType): Promise<void>;
}

/**
 * Type representing a function that handles a specific event type.
 *
 * @template EventType - The type of event the handler accepts, extending the {@link Event} interface.
 */
export type EventHandlerFunction<EventType extends Event> = (
  event: EventType
) => Promise<void>;

/**
 * Type representing an event handler, which can be either a function or a class implementing the {@link EventHandler} interface.
 *
 * @template EventType - The type of event the handler accepts, extending the {@link Event} interface.
 */
export type EventHandlerOrFunction<EventType extends Event> =
  | EventHandler<EventType>
  | EventHandlerFunction<EventType>;

/**
 * Represents an event emitter.
 * A function or class responsible for emitting events.
 *
 * @template KnownEvents - A record of known event types.
 *                         Keys are event names (strings), and values are the corresponding {@link Event} types.
 */
export interface EventEmitter<
  KnownEvents extends EventRegistry = EventRegistry
> {
  /**
   * Emits the given event.
   *
   * @template EventType - The type of event to emit.
   * @param event - The event to emit.
   * @returns A promise resolving to `void` after the event has been emitted.
   */
  emit<EventType extends KnownEvents[keyof KnownEvents]>(
    event: EventType
  ): Promise<void>;
}

/**
 * Represents a registry of events.
 */
export interface EventRegistry {
  [key: string]: Event<string, unknown>;
}

/**
 * Extracts the definitions for a list of events.
 */
export type ExtractEventDefinitions<Events extends EventRegistry> = {
  [Key in keyof Events]: Events[Key] extends Event<infer Name, infer Payload>
    ? Event<Name, Payload>
    : never;
};

/**
 * Extracts events from a given type.
 */
export type ExtractEvents<T> = T extends {
  events: EventRegistry;
}
  ? T['events']
  : EventRegistry;
