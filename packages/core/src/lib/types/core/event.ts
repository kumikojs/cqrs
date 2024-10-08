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

export type ExtractEventByName<
  Events extends EventRegistry,
  Name extends string
> = Extract<Events[keyof Events], { eventName: Name }>;

export type InferEvent<
  EventType extends Event,
  KnownEvents extends EventRegistry
> = ExtractEventByName<KnownEvents, EventType['eventName']> extends never
  ? EventType
  : ExtractEventByName<KnownEvents, EventType['eventName']>;

export interface EventEmitter<
  KnownEvents extends EventRegistry = EventRegistry
> {
  emit<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    event: InferEvent<EventType, KnownEvents>
  ): Promise<void>;
}

export interface EventBusContract<
  KnownEvents extends EventRegistry = EventRegistry
> extends EventEmitter<KnownEvents> {
  disconnect(): void;

  on<EventName extends keyof KnownEvents & string>(
    eventName: EventName,
    handler: EventHandlerOrFunction<ExtractEventByName<KnownEvents, EventName>>
  ): VoidFunction;
  on<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): VoidFunction;

  off<EventName extends keyof KnownEvents & string>(
    eventName: EventName,
    handler: EventHandlerOrFunction<ExtractEventByName<KnownEvents, EventName>>
  ): void;
  off<EventType extends Event = KnownEvents[keyof KnownEvents]>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): void;
}
