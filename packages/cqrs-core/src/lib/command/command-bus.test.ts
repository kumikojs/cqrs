/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CommandContract } from './command';
import { CommandBus, type CommandBusContract } from './command-bus';
import type { CommandHandlerContract } from './command-handler';

class TestCommand implements CommandContract {
  commandName: string;

  constructor(commandName: string) {
    this.commandName = commandName;
  }
}

describe('CommandBus', () => {
  let commandBus: CommandBusContract;

  beforeEach(() => {
    commandBus = new CommandBus();
  });

  describe('register', () => {
    test('should register a command handler as a function and unregister it', () => {
      const commandName = 'testCommand';
      const handler = vitest.fn();

      const unregister = commandBus.register(commandName, handler);

      expect(() =>
        commandBus.execute(new TestCommand(commandName))
      ).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);

      unregister();

      expect(() =>
        commandBus.execute(new TestCommand(commandName))
      ).rejects.toThrow();
    });

    test('should register a command handler as an object and unregister it', () => {
      const commandName = 'testCommand';
      const handler = {
        execute: vitest.fn(),
      };

      const unregister = commandBus.register(commandName, handler);

      expect(() =>
        commandBus.execute(new TestCommand(commandName))
      ).not.toThrow();
      expect(handler.execute).toHaveBeenCalledTimes(1);

      unregister();

      expect(() =>
        commandBus.execute(new TestCommand(commandName))
      ).rejects.toThrow();
    });

    test('should register a command handler as a class and unregister it', () => {
      const commandName = 'testCommand';
      class TestCommandHandler implements CommandHandlerContract<TestCommand> {
        execute(): Promise<string> {
          return Promise.resolve('test');
        }
      }

      const handler = new TestCommandHandler();

      const unregister = commandBus.register(commandName, handler);

      expect(() =>
        commandBus.execute(new TestCommand(commandName))
      ).not.toThrow();

      unregister();

      expect(() =>
        commandBus.execute(new TestCommand(commandName))
      ).rejects.toThrow();
    });
  });
});
