import { CommandClient } from './command-client';

import type { CommandContract } from './command';

describe('CommandClient', () => {
  test('should execute a command', async () => {
    const command = {
      commandName: 'test',
      payload: {},
    } as CommandContract;
    const client = new CommandClient();

    client.bus.register('test', () => Promise.resolve('test'));

    const result = await client.execute(command);

    expect(result).toBe('test');
  });

  test('should execute a command with a custom handler', async () => {
    const client = new CommandClient();

    const result = await client.execute(
      {
        commandName: 'test',
      },
      () => Promise.resolve('test')
    );

    expect(result).toBe('test');
  });

  test('should abort execution if signal is aborted', async () => {
    const client = new CommandClient();

    const controller = new AbortController();

    const result = client.execute(
      {
        commandName: 'test',
        context: {
          signal: controller.signal,
        },
      },
      async ({ context }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (context?.signal?.aborted) {
          throw new Error('aborted');
        }

        return 'test';
      }
    );

    controller.abort();

    await expect(result).rejects.toThrow('aborted');
  });

  test('should execute the same command only once', async () => {
    const client = new CommandClient();

    const commandName = 'testCommand';
    const handler = vitest.fn().mockResolvedValue('result');

    client.bus.register(commandName, handler);

    await Promise.all([
      client.execute({ commandName }),
      client.execute({ commandName }),
      client.execute({ commandName }),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
