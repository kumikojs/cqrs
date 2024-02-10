/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CommandContract } from './command';
import { CommandBus, type CommandBusContract } from './command-bus';
import type { CommandHandlerContract } from './command-handler';
import { CommandInterceptorManager } from './internal/command-interceptor-manager';

class TestCommand implements CommandContract {
  commandName: string;

  constructor(commandName: string) {
    this.commandName = commandName;
  }
}

describe('CommandBus', () => {
  let commandBus: CommandBusContract;

  beforeEach(() => {
    commandBus = new CommandBus({
      commandInterceptorManager: new CommandInterceptorManager(),
    });
  });

  describe('register', () => {
    test('should register a command handler as a function and unregister it', () => {
      const commandName = 'testCommand';
      const handler = vitest.fn();

      const unregister = commandBus.bind(commandName).to(handler);

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

      const unregister = commandBus.bind(commandName).to(handler);

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

      const unregister = commandBus.bind(commandName).to(handler);

      expect(() =>
        commandBus.execute(new TestCommand(commandName))
      ).not.toThrow();

      unregister();

      expect(() =>
        commandBus.execute(new TestCommand(commandName))
      ).rejects.toThrow();
    });
  });

  test('should execute a command without interceptor configured', async () => {
    const commandName = 'testCommand';
    const command = new TestCommand(commandName);
    const handler = vitest.fn();

    commandBus.bind(commandName).to(handler);

    await commandBus.execute(command);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(command);
  });

  test('should apply an interceptor globally', async () => {
    const interceptor = vitest.fn();
    const command = new TestCommand('testCommand');
    const command2 = new TestCommand('testCommand2');

    commandBus.bind('testCommand').to(async () => 'test');
    commandBus.bind('testCommand2').to(async () => 'test');
    commandBus.interceptors.apply(interceptor);

    await Promise.all([
      commandBus.execute(command),
      commandBus.execute(command2),
    ]);

    expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
    expect(interceptor).toHaveBeenCalledWith(command2, expect.any(Function));
  });

  describe('task manager', () => {
    test('should execute the same command only once', async () => {
      const commandName = 'testCommand';
      const handler = vitest.fn().mockResolvedValue('result');

      commandBus.bind(commandName).to(handler);

      const command = new TestCommand(commandName);

      await Promise.all([
        commandBus.execute(command),
        commandBus.execute(command),
        commandBus.execute(command),
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should intercept the same command execution and execute the command only once', async () => {
      const commandName = 'testCommand';
      const handler = vitest.fn().mockResolvedValue('result');
      const interceptor = vitest
        .fn()
        .mockImplementation(async (command, next) => {
          return next?.(command);
        });

      commandBus.bind(commandName).to(handler);
      commandBus.interceptors.apply(interceptor);

      const command = new TestCommand(commandName);

      await Promise.all([
        commandBus.execute(command),
        commandBus.execute(command),
        commandBus.execute(command),
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(interceptor).toHaveBeenCalledTimes(1);
    });
  });

  describe('aborting the command execution', () => {
    test('should stop the execution of the command by using the abort controller from command context', async () => {
      const commandName = 'testCommand';
      const handler = vitest.fn().mockResolvedValue('result');
      const interceptor = vitest
        .fn()
        .mockImplementation(async (command, next) => {
          command.abortController.abort();
          return next?.(command);
        });

      commandBus.bind(commandName).to(handler);
      commandBus.interceptors.apply(interceptor);

      const command = new TestCommand(commandName);

      await expect(commandBus.execute(command)).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
      expect(interceptor).toHaveBeenCalledTimes(1);
    });
  });
});
