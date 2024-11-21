import type { EmitterContract } from './emitter';
import type { EventHandler } from './handler';
import type {
  HandlerEventFromRegistry,
  HandlerEventFromType,
} from './inference';
import type { Event, EventsRegistry } from './types';

export interface EventBusContract<
  Registry extends EventsRegistry = EventsRegistry
> extends EmitterContract<Registry> {
  disconnect(): void;

  on<Name extends keyof Registry & string>(
    name: Name,
    handler: EventHandler<HandlerEventFromRegistry<Registry, Name>>
  ): VoidFunction;

  on<EventType extends Event = Registry[keyof Registry]>(
    name: EventType['name'],
    handler: EventHandler<HandlerEventFromType<EventType, Registry>>
  ): VoidFunction;

  off<Name extends keyof Registry & string>(
    name: Name,
    handler: EventHandler<HandlerEventFromRegistry<Registry, Name>>
  ): void;

  off<EventType extends Event = Registry[keyof Registry]>(
    name: EventType['name'],
    handler: EventHandler<HandlerEventFromType<EventType, Registry>>
  ): void;
}
