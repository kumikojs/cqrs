import { BulkheadStrategy } from '../strategy/bulkhead-strategy';
import { StrategyInterceptor } from '../strategy/internal/strategy-interceptor';
import { CommandContract } from './command';
import { CommandClient } from './command-client';

describe('CommandClient', () => {
  let commandClient: CommandClient;

  beforeEach(() => {
    commandClient = new CommandClient({
      bulkheadInterceptor: new StrategyInterceptor(
        new BulkheadStrategy({
          maxConcurrent: 2,
          maxQueue: 2,
        })
      ),
    });
  });

  test('should apply the fallback strategy', async () => {
    const command = {
      commandName: 'testCommand',
      payload: 'testPayload',
      options: { fallback: () => 'fallback' },
    } as CommandContract;

    commandClient.commandBus.bind('testCommand').to(async () => {
      throw new Error('error');
    });

    const result = await commandClient.commandBus.execute(command);

    expect(result).toBe('fallback');
  });

  test('should apply the retry strategy', async () => {
    const command = {
      commandName: 'testCommand',
      options: {
        retry: {
          maxRetries: 1,
          delay: 1000,
        },
      },
    } as CommandContract;
    let i = 0;

    commandClient.commandBus.bind('testCommand').to(async () => {
      if (i === 0) {
        i++;
        throw new Error('error');
      }

      return 'retryCommand';
    });

    const result = await commandClient.commandBus.execute(command);
    expect(result).toBe('retryCommand');
  });

  test('should apply the timeout strategy', async () => {
    const command = {
      commandName: 'testCommand',
      options: { timeout: '1ms' },
    } as CommandContract;

    commandClient.commandBus.bind('testCommand').to(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testCommand';
    });

    const result = commandClient.commandBus.execute(command);

    expect(result).rejects.toThrow('Task timed out after 1ms');
  });

  test('should apply the bulkhead strategy', async () => {
    const options = { bulkhead: true } as CommandContract['options'];

    const handler = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testCommand';
    };

    commandClient.commandBus.bind('testCommand').to(handler);
    commandClient.commandBus.bind('testCommand2').to(handler);
    commandClient.commandBus.bind('testCommand3').to(handler);
    commandClient.commandBus.bind('testCommand4').to(handler);
    commandClient.commandBus.bind('testCommand5').to(handler);

    const result = Promise.all([
      commandClient.commandBus.execute({ commandName: 'testCommand', options }),
      commandClient.commandBus.execute({
        commandName: 'testCommand2',
        options,
      }),
      commandClient.commandBus.execute({
        commandName: 'testCommand3',
        options,
      }),
      commandClient.commandBus.execute({
        commandName: 'testCommand4',
        options,
      }),
      commandClient.commandBus.execute({
        commandName: 'testCommand5',
        options,
      }),
    ]);

    expect(result).rejects.toThrow(
      'Bulkhead is full with 2 active and 2 queued'
    );
  });

  test('should apply the throttle strategy', async () => {
    const command = {
      commandName: 'testCommand',
      options: { throttle: { limit: 2, ttl: '1000ms' } },
    } as CommandContract;

    commandClient.commandBus.bind('testCommand').to(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testCommand';
    });

    commandClient.commandBus.execute(command);
    await new Promise((resolve) => setTimeout(resolve, 100));

    commandClient.commandBus.execute(command);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = commandClient.commandBus.execute(command);

    expect(result).rejects.toThrowError('Rate limit exceeded');
  });

  describe('compose strategies', () => {
    test('should apply the retry before the fallback strategy', async () => {
      const command = {
        commandName: 'testCommand',
        options: {
          retry: { maxRetries: 2, delay: 100 },
          fallback: () => 'fallback',
        },
      } as CommandContract;
      let i = 0;
      const watcher = vitest.fn();
      const handler = async () => {
        if (i <= 2) {
          i++;
          watcher();
          throw new Error('error');
        }

        return 'retryCommand';
      };

      commandClient.commandBus.bind(command.commandName).to(handler);

      const result = await commandClient.commandBus.execute(command);
      expect(result).toBe('fallback');
      expect(watcher).toHaveBeenCalledTimes(3);
    });

    test('should apply the timeout before the retry strategy', async () => {
      const command = {
        commandName: 'testCommand',
        options: {
          timeout: '1ms',
          retry: { maxRetries: 2, delay: 100 },
        },
      } as CommandContract;
      let i = 0;
      const watcher = vitest.fn();

      const handler = async () => {
        if (i < 2) {
          i++;
          watcher();
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'testCommand';
        }

        return 'retryCommand';
      };

      commandClient.commandBus.bind(command.commandName).to(handler);

      const result = await commandClient.commandBus.execute(command);
      expect(result).toBe('retryCommand');
      expect(watcher).toHaveBeenCalledTimes(2);
    });

    test('should apply timeout->retry->fallback strategy', async () => {
      const command = {
        commandName: 'testCommand',
        options: {
          timeout: '1ms',
          retry: { maxRetries: 2, delay: 100 },
          fallback: () => 'fallback',
        },
      } as CommandContract;
      let i = 0;
      const watcher = vitest.fn();
      const handler = async () => {
        if (i <= 2) {
          i++;
          watcher();
          await new Promise((resolve) => setTimeout(resolve, 100));
          throw new Error('error');
        }

        return 'retryCommand';
      };

      commandClient.commandBus.bind(command.commandName).to(handler);

      const result = await commandClient.commandBus.execute(command);
      expect(result).toBe('fallback');
      expect(watcher).toHaveBeenCalledTimes(3);
    });
  });
});
