import type { EmitEventFromType, EmitEventFromRegistry } from './inference';
import type { Event, EventsRegistry } from './types';

export interface EmitterContract<
  Registry extends EventsRegistry = EventsRegistry
> {
  emit<Name extends keyof Registry & string>(
    event: EmitEventFromRegistry<Registry, Name> & { name: Name }
  ): Promise<void>;

  emit<EventType extends Event = Registry[keyof Registry]>(
    event: EmitEventFromType<EventType, Registry>
  ): Promise<void>;
}
