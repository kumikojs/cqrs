/**
 * @module event
 */
import type { Nullable } from '../types';

/**
 * Interface defining the structure of an event.
 * Represents an occurrence or happening within the application domain.
 *
 * @template TName - The unique name of the event, typically a string literal.
 * @template TPayload - The optional payload data associated with the event, providing additional context or information.
 * @example
 * ```typescript
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
   * The unique name of the event that serves as an identifier.
   */
  eventName: TName;

  /**
   * The optional payload data associated with the event, potentially containing details about the occurrence.
   */
  payload?: Nullable<TPayload>;
}

/**
 * Interface defining the contract for an event handler function or class.
 * Represents a function or class responsible for handling a specific event type.
 *
 * @template TEvent - The type of event the handler accepts, extending the {@link EventContract} interface.
 * @example
 * ```typescript
 * import type { EventContract, EventHandlerContract } from '@stoik/cqrs-core';
 *
 * type UserCreatedEvent = EventContract<'user.created', { id: number; name: string; }>;
 *
 * // Function-based handler
 * const userCreatedHandler: EventHandlerContract<UserCreatedEvent> = {
 *   async handle(event) {
 *     console.log('User created:', event.payload);
 *   },
 * };
 *
 * // Class-based handler
 * class UserUpdatedHandler implements EventHandlerContract<UserUpdatedEvent> {
 *   async handle(event) {
 *     console.log('User updated:', event.payload);
 *   }
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
   * @returns A promise resolving to `void` as event handling typically doesn't return a specific value.
   */
  handle(event: TEvent): Promise<void>;
}
