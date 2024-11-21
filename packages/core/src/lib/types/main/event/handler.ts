import type { Event } from './types';

export interface EventHandlerContract<EventType extends Event = Event> {
  handle(event: EventType): Promise<void>;
}

export type EventHandlerFunction<EventType extends Event> = (
  event: EventType
) => Promise<void>;

export type EventHandler<EventType extends Event> =
  | EventHandlerContract<EventType>
  | EventHandlerFunction<EventType>;
