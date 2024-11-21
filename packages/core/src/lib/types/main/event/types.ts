import type { BaseMessage, BaseRegistry, WithPayload } from '../base/types';

export interface Event<Name extends string = string, Payload = unknown>
  extends BaseMessage<Name>,
    WithPayload<Payload> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EventsRegistry extends BaseRegistry<Event> {}
