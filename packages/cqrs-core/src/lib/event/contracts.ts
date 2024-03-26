import type { Nullable } from '../types';

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
    handler:
      | EventHandlerContract<TEvent>
      | EventHandlerContract<TEvent>['handle']
  ): VoidFunction;

  off<TEvent extends KnownEvents[keyof KnownEvents]>(
    eventName: TEvent['eventName'],
    handler:
      | EventHandlerContract<TEvent>
      | EventHandlerContract<TEvent>['handle']
  ): void;

  emit<TEvent extends KnownEvents[keyof KnownEvents]>(
    event: TEvent
  ): Promise<void>;
}
