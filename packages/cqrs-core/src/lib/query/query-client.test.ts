import { QueryClient } from './query-client';

import type { QueryContract } from './query';

describe('QueryClient', () => {
  test('should execute a query', async () => {
    const query = {
      queryName: 'test',
      payload: {},
    } as QueryContract;
    const client = new QueryClient();

    client.bus.register('test', () => Promise.resolve('test'));

    const result = await client.execute(query);

    expect(result).toBe('test');
  });

  test('should execute a query with a custom handler', async () => {
    const client = new QueryClient();

    const result = await client.execute(
      {
        queryName: 'test',
      },
      () => Promise.resolve('test')
    );

    expect(result).toBe('test');
  });

  test('should abort execution if signal is aborted', async () => {
    const client = new QueryClient();

    const controller = new AbortController();

    const result = client.execute(
      {
        queryName: 'test',
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

  test('should execute the same query only once', async () => {
    const client = new QueryClient();

    const queryName = 'testQuery';
    const handler = vitest.fn().mockResolvedValue('result');

    client.bus.register(queryName, handler);

    await Promise.all([
      client.execute({ queryName }),
      client.execute({ queryName }),
      client.execute({ queryName }),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
