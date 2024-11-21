import { describe, expectTypeOf, it } from 'vitest';
import type { CommandBusContract } from './bus';
import type { Command } from './types';

// Test Commands
type UserCreateCommand = Command<
  'userCreate',
  { name: string; email: string },
  { validate: boolean },
  { userId: string }
>;

type UserUpdateCommand = Command<
  'userUpdate',
  { id: string; changes: Record<string, unknown> },
  { retry: boolean },
  { orgId: string }
>;

type UserDeleteCommand = Command<
  'userDelete',
  { id: string },
  never,
  { admin: boolean }
>;

// Custom command not in registry
type CustomCommand = Command<'custom', { data: string }>;

// Test Registry
type TestRegistry = {
  userCreate: UserCreateCommand;
  userUpdate: UserUpdateCommand;
  userDelete: UserDeleteCommand;
};

type TestQueries = {
  'get-user': {
    input: { name: 'get-user'; payload: { id: string } };
    output: { id: string; name: string };
  };
};

type TestEvents = {
  'user-updated': {
    name: 'user-updated';
    payload: { userId: string; changes: Record<string, unknown> };
  };
};

describe('Command Type Inference', () => {
  describe('CommandBusContract', () => {
    const bus = {
      execute: vitest.fn(),
      dispatch: vitest.fn(),
      register: vitest.fn(),
      unregister: vitest.fn(),
      disconnect: vitest.fn(),
    } as unknown as CommandBusContract<TestRegistry, TestQueries, TestEvents>;

    it('should properly type execute with registry commands', async () => {
      await bus.execute(
        {
          name: 'userCreate',
          payload: { name: 'John', email: 'john@example.com' },
          options: { validate: true },
        },
        async (command) => {
          expectTypeOf(command.payload).toEqualTypeOf<{
            name: string;
            email: string;
          }>();
          expectTypeOf(command.name).toEqualTypeOf<'userCreate'>();

          // @ts-expect-error - Options are not part of the handler scope
          command.options;

          expectTypeOf(command.context.userId).toEqualTypeOf<string>();
        }
      );

      // @ts-expect-error - Invalid command name
      await bus.execute(
        {
          name: 'invalidCommand',
          payload: { name: 'John' },
        },
        async () => {
          return;
        }
      );

      await bus.execute(
        {
          name: 'userCreate',
          payload: { name: 'John', email: 'john@example.com' },
          options: { validate: true },
        },
        async (command) => {
          // @ts-expect-error - Wrong payload type
          command.payload.invalid;
        }
      );

      await bus.execute(
        // @ts-expect-error - Missing required options
        {
          name: 'userCreate',
          payload: { name: 'John', email: 'john@example.com' },
        },
        async (command) => {
          // @ts-expect-error - Wrong payload type
          command.payload.invalid;
        }
      );
    });

    it('should properly type execute with custom commands', async () => {
      await bus.execute<CustomCommand>(
        {
          name: 'custom',
          payload: { data: 'test' },
        },
        async (command) => {
          expectTypeOf(command.payload).toEqualTypeOf<{ data: string }>();
          expectTypeOf(command.name).toEqualTypeOf<'custom'>();
        }
      );

      await bus.execute<CustomCommand>(
        {
          name: 'custom',
          payload: { data: 'test' },
        },
        async (command) => {
          // @ts-expect-error - Wrong payload type
          command.payload.invalid;
        }
      );
    });

    it('should properly type dispatch', async () => {
      // Registry command
      await bus.dispatch({
        name: 'userCreate',
        payload: { name: 'John', email: 'john@example.com' },
        options: { validate: true },
      });

      // @ts-expect-error - Missing required payload
      await bus.dispatch({
        name: 'userCreate',
      });

      await bus.dispatch({
        name: 'userCreate',
        // @ts-expect-error - Invalid payload
        payload: { name: 'John' },
      });

      // Custom command
      await bus.dispatch<CustomCommand>({
        name: 'custom',
        payload: { data: 'test' },
      });

      await bus.dispatch<CustomCommand>({
        name: 'custom',
        // @ts-expect-error - Invalid custom command payload
        payload: { invalid: 'test' },
      });
    });

    it('should properly type command registration', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handler = async (command: UserCreateCommand) => {
        return;
      };

      bus.register('userCreate', handler);

      // @ts-expect-error - Invalid command name
      bus.register('invalidCommand', handler);

      // @ts-expect-error - Mismatched handler type
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      bus.register('userCreate', async (command: UserUpdateCommand) => {
        return;
      });
    });

    it('should properly type command unregistration', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handler = async (command: UserCreateCommand) => {
        return;
      };

      bus.unregister('userCreate', handler);

      // @ts-expect-error - Invalid command name
      bus.unregister('invalidCommand', handler);

      // @ts-expect-error - Mismatched handler type
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      bus.unregister('userCreate', async (command: UserUpdateCommand) => {
        return;
      });
    });
  });
});
