import { describe, it } from 'vitest';
import type { EmitterContract } from './emitter';
import type { Event } from './types';

describe('EmitterContract', () => {
  type UserCreatedEvent = Event<
    'userCreated',
    {
      id: string;
      name: string;
    }
  >;

  type UserUpdatedEvent = Event<
    'userUpdated',
    {
      id: string;
      changes: Record<string, unknown>;
    }
  >;

  type UserDeletedEvent = Event<
    'userDeleted',
    {
      id: string;
    }
  >;

  type OptionalEvent = Event<
    'optional',
    {
      id?: string;
      data?: unknown;
    }
  >;

  type NoPayloadEvent = Event<'noPayload'>;

  type TestRegistry = {
    userCreated: UserCreatedEvent;
    userUpdated: UserUpdatedEvent;
    userDeleted: UserDeletedEvent;
    optional: OptionalEvent;
    noPayload: NoPayloadEvent;
  };

  const emitter = {
    emit: vitest.fn(),
  } as EmitterContract<TestRegistry>;

  describe('Registry Events', () => {
    it('should enforce payload for registry events', async () => {
      // Valid emissions
      await emitter.emit({
        name: 'userCreated',
        payload: { id: '1', name: 'John' },
      });

      await emitter.emit({
        name: 'userUpdated',
        payload: { id: '1', changes: { name: 'John' } },
      });

      // @ts-expect-error - Missing required payload
      await emitter.emit({
        name: 'userCreated',
      });

      // @ts-expect-error - Missing required payload field
      await emitter.emit({
        name: 'userCreated',
        payload: { id: '1' },
      });

      await emitter.emit({
        name: 'userCreated',
        // @ts-expect-error - Extra payload field
        payload: { id: '1', name: 'John', extra: true },
      });
    });

    it('should handle no-payload events', async () => {
      // Valid
      await emitter.emit({
        name: 'noPayload',
      });

      // @ts-expect-error - Payload not allowed
      await emitter.emit({
        name: 'noPayload',
        payload: {},
      });

      // @ts-expect-error - Payload not allowed
      await emitter.emit({
        name: 'noPayload',
        payload: { data: 'test' },
      });
    });

    it('should reject unknown event names', async () => {
      await emitter.emit({
        // @ts-expect-error - Unknown event name
        name: 'unknown',
        payload: { data: 'test' },
      });

      await emitter.emit({
        // @ts-expect-error - Wrong event name type
        name: 123,
        payload: { data: 'test' },
      });
    });
  });

  describe('Custom Events', () => {
    it('should handle explicit custom events', async () => {
      type CustomEvent = Event<'custom', { data: string }>;

      // Valid custom event
      await emitter.emit<CustomEvent>({
        name: 'custom',
        payload: { data: 'test' },
      });

      // @ts-expect-error - Missing required payload
      await emitter.emit<CustomEvent>({
        name: 'custom',
      });

      await emitter.emit<CustomEvent>({
        name: 'custom',
        // @ts-expect-error - Wrong payload type
        payload: { data: 123 },
      });

      await emitter.emit<CustomEvent>({
        name: 'custom',
        // @ts-expect-error - Extra payload field
        payload: { data: 'test', extra: true },
      });
    });

    it('should handle custom events with optional payload', async () => {
      type OptionalCustomEvent = Event<
        'optionalCustom',
        {
          data?: string;
          meta?: { [key: string]: unknown };
        }
      >;

      // Valid with no payload
      await emitter.emit<OptionalCustomEvent>({
        name: 'optionalCustom',
      });

      // Valid with partial payload
      await emitter.emit<OptionalCustomEvent>({
        name: 'optionalCustom',
        payload: { data: 'test' },
      });
    });

    it('should handle custom events with no payload', async () => {
      type NoPayloadCustomEvent = Event<'noPayloadCustom'>;

      // Valid
      await emitter.emit<NoPayloadCustomEvent>({
        name: 'noPayloadCustom',
      });

      await emitter.emit<NoPayloadCustomEvent>({
        name: 'noPayloadCustom',
        // @ts-expect-error - Payload not allowed
        payload: {},
      });
    });
  });
});
