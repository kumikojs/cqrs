import { describe, it, expectTypeOf } from 'vitest';
import type { Event } from './types';
import type { EventBusContract } from './bus';

// Test Events
type UserCreatedEvent = Event<'userCreated', { id: string; name: string }>;
type UserUpdatedEvent = Event<
  'userUpdated',
  { id: string; changes: Record<string, unknown> }
>;
type UserDeletedEvent = Event<'userDeleted', { id: string }>;

// Custom event not in registry
type CustomEvent = Event<'custom', { data: string }>;

// Test Registry
type TestRegistry = {
  userCreated: UserCreatedEvent;
  userUpdated: UserUpdatedEvent;
  userDeleted: UserDeletedEvent;
};

describe('Event Type Inference', () => {
  describe('EventBusContract', () => {
    const bus = {
      on: vitest.fn(),
      off: vitest.fn(),
      emit: vitest.fn(),
    } as unknown as EventBusContract<TestRegistry>;

    it('should properly type event handlers with registry events', () => {
      bus.on('userCreated', async (event) => {
        expectTypeOf(event.payload).toEqualTypeOf<{
          id: string;
          name: string;
        }>();
        expectTypeOf(event.name).toEqualTypeOf<'userCreated'>();
      });

      // @ts-expect-error - Invalid event name
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      bus.on('invalidEvent', async (event) => {
        return;
      });

      bus.on('userCreated', async (event) => {
        // @ts-expect-error - Wrong payload type
        event.payload.invalid;
      });
    });

    it('should properly type event handlers with custom events', () => {
      bus.on<CustomEvent>('custom', async (event) => {
        expectTypeOf(event.payload).toEqualTypeOf<{ data: string }>();
        expectTypeOf(event.name).toEqualTypeOf<'custom'>();
      });

      bus.on<CustomEvent>('custom', async (event) => {
        // @ts-expect-error - Wrong payload type for custom event
        event.payload.invalid;
      });
    });

    it('should properly type event emission', async () => {
      // Registry event
      await bus.emit({
        name: 'userCreated',
        payload: { id: '1', name: 'John' },
      });

      // @ts-expect-error - Missing required payload
      await bus.emit({
        name: 'userCreated',
      });

      // @ts-expect-error - Invalid payload
      await bus.emit({
        name: 'userCreated',
        payload: { id: '1' },
      });

      // Custom event
      await bus.emit<CustomEvent>({
        name: 'custom',
        payload: { data: 'test' },
      });

      await bus.emit<CustomEvent>({
        name: 'custom',
        // @ts-expect-error - Invalid custom event payload
        payload: { invalid: 'test' },
      });
    });

    it('should properly type event unsubscription', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handler = async (event: UserCreatedEvent) => {
        return;
      };

      bus.off('userCreated', handler);

      // @ts-expect-error - Invalid event name
      bus.off('invalidEvent', handler);

      // @ts-expect-error - Mismatched handler type
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      bus.off('userCreated', async (event: UserUpdatedEvent) => {
        return;
      });
    });

    it('should properly type event disconnection', () => {
      bus.disconnect();

      // Should accept no parameters
      // @ts-expect-error - Disconnect takes no parameters
      bus.disconnect('userCreated');

      // @ts-expect-error - Disconnect takes no parameters
      bus.disconnect(() => {
        return;
      });
    });
  });
});
