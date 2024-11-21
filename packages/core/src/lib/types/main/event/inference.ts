import type { PayloadRequirement } from '../base/helper';
import { ExtractByName } from '../base/inference';
import type { Event, EventsRegistry } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InferPayload<E extends Event> = E extends Event<any, infer P>
  ? PayloadRequirement<P> extends 'never'
    ? { payload?: never }
    : PayloadRequirement<P> extends 'optional'
    ? { payload?: P }
    : { payload: P }
  : never;

// Updated emit event types
export type EmitEventFromType<
  EventType extends Event,
  Registry extends EventsRegistry
> = EventType extends { name: infer Name }
  ? Name extends keyof Registry
    ? Omit<Registry[Name], 'payload'> & InferPayload<Registry[Name]>
    : Omit<EventType, 'payload'> & InferPayload<EventType>
  : never;

export type EmitEventFromRegistry<
  Registry extends EventsRegistry,
  Name extends keyof Registry & string
> = Omit<Registry[Name], 'payload'> & InferPayload<Registry[Name]>;

// Updated handler event types
export type HandlerEvent<
  EventType extends Event,
  Registry extends EventsRegistry
> = ExtractByName<Registry, EventType['name']> extends never
  ? Omit<EventType, 'payload'> & InferPayload<EventType>
  : Omit<ExtractByName<Registry, EventType['name']>, 'payload'> &
      InferPayload<ExtractByName<Registry, EventType['name']>>;

export type HandlerEventFromType<
  EventType extends Event,
  Registry extends EventsRegistry
> = EventType extends { name: infer Name }
  ? Name extends keyof Registry
    ? Omit<Registry[Name], 'payload'> & InferPayload<Registry[Name]>
    : Omit<EventType, 'payload'> & InferPayload<EventType>
  : never;

export type HandlerEventFromRegistry<
  Registry extends EventsRegistry,
  Name extends keyof Registry & string
> = Omit<Registry[Name], 'payload'> & InferPayload<Registry[Name]>;
