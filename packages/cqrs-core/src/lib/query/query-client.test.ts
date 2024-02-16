import {
  BulkheadException,
  BulkheadStrategy,
} from '../strategy/bulkhead-strategy';
import { ThrottleException } from '../strategy/throttle-strategy';
import { TimeoutException } from '../strategy/timeout-strategy';
import { QueryContract } from './query';
import { QueryClient } from './query-client';

describe('QueryClient', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      bulkheadStrategy: new BulkheadStrategy({
        maxConcurrent: 2,
        maxQueue: 2,
      }),
    });
  });

  test('should apply the cache strategy', async () => {
    const query = {
      queryName: 'testQuery',
      options: {
        cache: {
          ttl: 1000,
          persist: false,
        },
      },
    } as QueryContract;
    let i = 0;

    queryClient.queryBus.bind('testQuery').to(async () => {
      i++;
      return i;
    });

    const result = await queryClient.queryBus.execute(query);
    const result2 = await queryClient.queryBus.execute(query);

    expect(result).toBe(1);
    expect(result2).toBe(result);
  });

  test('should apply the fallback strategy', async () => {
    const query = {
      queryName: 'testQuery',
      payload: 'testPayload',
      options: { fallback: () => 'fallback' },
    } as QueryContract;

    queryClient.queryBus.bind('testQuery').to(async () => {
      throw new Error('error');
    });

    const result = await queryClient.queryBus.execute(query);

    expect(result).toBe('fallback');
  });

  test('should apply the retry strategy', async () => {
    const query = {
      queryName: 'testQuery',
      options: {
        retry: {
          maxRetries: 1,
          delay: 1000,
        },
      },
    } as QueryContract;
    let i = 0;

    queryClient.queryBus.bind('testQuery').to(async () => {
      if (i === 0) {
        i++;
        throw new Error('error');
      }

      return 'retryQuery';
    });

    const result = await queryClient.queryBus.execute(query);
    expect(result).toBe('retryQuery');
  });

  test('should apply the timeout strategy', async () => {
    const query = {
      queryName: 'testQuery',
      options: { timeout: '1ms' },
    } as QueryContract;

    queryClient.queryBus.bind('testQuery').to(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testQuery';
    });

    const result = queryClient.queryBus.execute(query);

    expect(result).rejects.toThrowError(new TimeoutException(1));
  });

  test('should apply the bulkhead strategy', async () => {
    const options = { bulkhead: true } as QueryContract['options'];

    const handler = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testQuery';
    };

    queryClient.queryBus.bind('testQuery').to(handler);
    queryClient.queryBus.bind('testQuery2').to(handler);
    queryClient.queryBus.bind('testQuery3').to(handler);
    queryClient.queryBus.bind('testQuery4').to(handler);
    queryClient.queryBus.bind('testQuery5').to(handler);

    const result = Promise.all([
      queryClient.queryBus.execute({ queryName: 'testQuery', options }),
      queryClient.queryBus.execute({
        queryName: 'testQuery2',
        options,
      }),
      queryClient.queryBus.execute({
        queryName: 'testQuery3',
        options,
      }),
      queryClient.queryBus.execute({
        queryName: 'testQuery4',
        options,
      }),
      queryClient.queryBus.execute({
        queryName: 'testQuery5',
        options,
      }),
    ]);

    expect(result).rejects.toThrowError(new BulkheadException(2, 2));
  });

  test('should apply the throttle strategy', async () => {
    const query = {
      queryName: 'testQuery',
      options: { throttle: { limit: 2, ttl: '1000ms' } },
    } as QueryContract;

    queryClient.queryBus.bind('testQuery').to(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testQuery';
    });

    queryClient.queryBus.execute(query);
    await new Promise((resolve) => setTimeout(resolve, 100));

    queryClient.queryBus.execute(query);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = queryClient.queryBus.execute(query);

    expect(result).rejects.toThrowError(new ThrottleException(2, '1000ms'));
  });

  describe('compose strategies', () => {
    test('should apply the cache before the fallback strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          cache: { ttl: 1000, persist: false },
          fallback: () => 'fallback',
        },
      } as QueryContract;

      let i = 0;

      queryClient.queryBus.bind('testQuery').to(async () => {
        if (i++ === 1) {
          throw new Error('error');
        }

        return 'testQuery';
      });

      const result = await queryClient.queryBus.execute(query);
      const result2 = await queryClient.queryBus.execute(query);

      expect(result).toBe('testQuery');
      expect(result2).toBe(result);
    });

    test('should apply the retry before the fallback strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          retry: { maxRetries: 2, delay: 100 },
          fallback: () => 'fallback',
        },
      } as QueryContract;
      let i = 0;
      const watcher = vitest.fn();
      const handler = async () => {
        if (i <= 2) {
          i++;
          watcher();
          throw new Error('error');
        }

        return 'retryQuery';
      };

      queryClient.queryBus.bind(query.queryName).to(handler);

      const result = await queryClient.queryBus.execute(query);
      expect(result).toBe('fallback');
      expect(watcher).toHaveBeenCalledTimes(3);
    });

    test('should apply the timeout before the retry strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          timeout: '1ms',
          retry: { maxRetries: 2, delay: 100 },
        },
      } as QueryContract;
      let i = 0;
      const watcher = vitest.fn();

      const handler = async () => {
        if (i < 2) {
          i++;
          watcher();
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'testQuery';
        }

        return 'retryQuery';
      };

      queryClient.queryBus.bind(query.queryName).to(handler);

      const result = await queryClient.queryBus.execute(query);
      expect(result).toBe('retryQuery');
      expect(watcher).toHaveBeenCalledTimes(2);
    });

    test('should apply timeout->retry->fallback strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          timeout: '1ms',
          retry: { maxRetries: 2, delay: 100 },
          fallback: () => 'fallback',
        },
      } as QueryContract;
      let i = 0;
      const watcher = vitest.fn();
      const handler = async () => {
        if (i <= 2) {
          i++;
          watcher();
          await new Promise((resolve) => setTimeout(resolve, 100));
          throw new Error('error');
        }

        return 'retryQuery';
      };

      queryClient.queryBus.bind(query.queryName).to(handler);

      const result = await queryClient.queryBus.execute(query);
      expect(result).toBe('fallback');
      expect(watcher).toHaveBeenCalledTimes(3);
    });
  });
});
