import type { Nullable } from '../internal/types';
import type { EventHandlerFn } from './types';

export interface EventContract<
  TName extends string = string,
  TPayload = unknown
> {
  eventName: TName;
  payload?: Nullable<TPayload>;
}

export interface EventHandlerContract<
  TEvent extends EventContract = EventContract
> {
  handle(event: TEvent): Promise<void>;
}

export interface EventBusContract<
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> {
  on<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ): VoidFunction;

  off<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ): void;

  emit<TEvent extends KnownEvents[keyof KnownEvents]>(
    event: TEvent
  ): Promise<void>;
}
