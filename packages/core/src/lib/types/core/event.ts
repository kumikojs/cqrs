export interface Event<Name extends string = string, Payload = unknown> {
  eventName: Name;
  payload?: Payload extends null | undefined | never ? never : Payload;
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

export type GetEventByName<
  Events extends EventRegistry,
  Name extends string
> = {
  [Key in keyof Events]: Events[Key]['eventName'] extends Name
    ? Events[Key]
    : never;
}[keyof Events];

export type EventForEmit<
  EventType extends Event,
  KnownEvents extends EventRegistry
> = EventType extends Event
  ? GetEventByName<KnownEvents, EventType['eventName']> extends never
    ? EventType
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

  on<EventName extends keyof KnownEvents & string>(
    eventName: EventName,
    handler: EventHandlerOrFunction<GetEventByName<KnownEvents, EventName>>
  ): VoidFunction;
  on<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): VoidFunction;

  off<EventName extends keyof KnownEvents & string>(
    eventName: EventName,
    handler: EventHandlerOrFunction<GetEventByName<KnownEvents, EventName>>
  ): void;
  off<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): void;
}
