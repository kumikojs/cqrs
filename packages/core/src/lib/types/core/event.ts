import type { Maybe } from '../helpers';

export interface Event<Name extends string = string, Payload = unknown> {
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

export type EventRegistry = Record<string, Event>;

export type ExtractEvents<T> = T extends {
  events: EventRegistry;
}
  ? T['events']
  : EventRegistry;

type GetEventByName<Events extends EventRegistry, Name extends string> = {
  [Key in keyof Events]: Events[Key]['eventName'] extends Name
    ? Events[Key]
    : never;
}[keyof Events];

type EventForEmit<
  EventType extends Event,
  KnownEvents extends EventRegistry
> = EventType extends Event
  ? GetEventByName<KnownEvents, EventType['eventName']> extends never
    ? Event<EventType['eventName'], EventType['payload']>
    : GetEventByName<KnownEvents, EventType['eventName']>
  : never;

export interface EventEmitter<
  KnownEvents extends EventRegistry = EventRegistry
> {
  emit<EventType extends Event>(
    event: EventForEmit<EventType, KnownEvents>
  ): Promise<void>;
}

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
