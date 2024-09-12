import type { Maybe } from '../helpers';

export interface Event<Name extends string = string, Payload = unknown> {
  /**
   * The unique name of the event that serves as an identifier.
   */
  eventName: Name;

  payload: Maybe<Payload>;
}

export interface EventHandler<EventType extends Event = Event> {
  handle(event: EventType): Promise<void>;
}

export type EventHandlerFunction<EventType extends Event> = (
  event: EventType
) => Promise<void>;

export type EventHandlerOrFunction<EventType extends Event> =
  | EventHandler<EventType>
  | EventHandlerFunction<EventType>;

export interface EventEmitter<
  KnownEvents extends EventRegistry = EventRegistry
> {
  emit<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    event: ExtractEventDefinitions<KnownEvents>[EventType['eventName']]
  ): Promise<void>;
}

export type EventRegistry = Record<string, Event>;

export type ExtractEventDefinitions<Events extends EventRegistry> = {
  [Key in keyof Events]: Events[Key] extends Event<infer Name, infer Payload>
    ? Event<Name, Payload>
    : never;
};

export type ExtractEvents<T> = T extends {
  events: EventRegistry;
}
  ? T['events']
  : EventRegistry;

export interface EventBusContract<
  KnownEvents extends EventRegistry = EventRegistry
> extends EventEmitter<KnownEvents> {
  disconnect(): void;

  on<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): VoidFunction;

  off<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): void;
}
