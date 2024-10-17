/* eslint-disable @typescript-eslint/no-explicit-any */

import { NoHandlerFoundException } from '../../infrastructure/bus/bus_exception';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';
import { ResilienceInterceptorsBuilder } from './resilience_interceptors_builder';
import { ThrottleException } from './strategies/exceptions/throttle_exception';
import { TimeoutException } from './strategies/exceptions/timeout_exception';

describe('ResilienceInterceptorsBuilder', () => {
  let resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<any>;
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache({
      l2: {
        driver: new MemoryStorageDriver(),
      },
    });
    resilienceInterceptorsBuilder = new ResilienceInterceptorsBuilder(
      cache,
      new KumikoLogger(),
      {
        serialize: (request) => JSON.stringify(request),
      }
    );
  });

  it('should intercept in the order they were added', async () => {
    const order: string[] = [];

    // Adding interceptors in a specific order
    const interceptors = resilienceInterceptorsBuilder.build();
    interceptors.tap(
      () => true,
      async (command, next) => {
        order.push('retry');
        return next?.(command);
      }
    );
    interceptors.tap(
      () => true,
      async (command, next) => {
        order.push('timeout');
        return next?.(command);
      }
    );
    interceptors.tap(
      () => true,
      async (command, next) => {
        order.push('throttle');
        return next?.(command);
      }
    );
    interceptors.use(async (command, next) => {
      order.push('fallback');
      return next?.(command);
    });
    interceptors.tap(
      () => true,
      async (command, next) => {
        order.push('cache');
        return next?.(command);
      }
    );
    interceptors.use(async (command, next) => {
      order.push('deduplication');
      return next?.(command);
    });

    await interceptors.execute({}, async () => {
      return;
    });

    expect(order).toEqual([
      'retry',
      'timeout',
      'throttle',
      'fallback',
      'cache',
      'deduplication',
    ]);
  });

  describe('DeduplicationInterceptor', () => {
    it('should deduplicate the task', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
      };

      const handler = vitest.fn();
      const interceptors = resilienceInterceptorsBuilder
        .addDeduplicationInterceptor()
        .build();

      await Promise.all([
        interceptors.execute(request, handler),
        interceptors.execute(request, handler),
        interceptors.execute(request, handler),
        interceptors.execute(request, handler),
      ]);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('RetryInterceptor', () => {
    it('should retry the task until it succeeds', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          retry: {
            maxAttempts: 6,
            delay: 1,
          },
        },
      };

      const handler = vitest
        .fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockRejectedValueOnce(new Error('Test error'))
        .mockRejectedValueOnce(new Error('Test error'))
        .mockRejectedValueOnce(new Error('Test error'))
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce(undefined);

      const interceptors = resilienceInterceptorsBuilder
        .addRetryInterceptor()
        .build();

      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalledTimes(6); // The initial call + 5 retry attempts
    });

    it('should reject the task if it fails after all retries', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          retry: {
            maxAttempts: 4,
            delay: 1,
          },
        },
      };

      const handler = vitest.fn().mockRejectedValue(new Error('Test error'));
      const interceptors = resilienceInterceptorsBuilder
        .addRetryInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).rejects.toThrowError(
        'Test error'
      );
      expect(handler).toHaveBeenCalledTimes(5); // The initial call + 4 retry attempts
    });

    it('should not apply retry when options.retry is false', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          retry: false, // Explicitly set to false
        },
      };

      const handler = vitest.fn().mockRejectedValue(new Error('Test error'));

      const interceptors = resilienceInterceptorsBuilder
        .addRetryInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).rejects.toThrowError(
        'Test error'
      );
      expect(handler).toHaveBeenCalledTimes(1); // Only the initial call
    });

    it('should apply default retry when options.retry is undefined', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          // retry is undefined (default 3 attempts, 1s delay)
        },
      };

      const handler = vitest
        .fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockRejectedValueOnce(new Error('Test error'))
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce(undefined);

      const interceptors = resilienceInterceptorsBuilder
        .addRetryInterceptor()
        .build();

      const executePromise = interceptors.execute(request, handler);

      await expect(executePromise).resolves.toBeUndefined();

      expect(handler).toHaveBeenCalledTimes(4);
    });
  }, 10000);

  describe('TimeoutInterceptor', () => {
    it('should reject the task after the timeout', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          timeout: 50,
        },
      };

      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      };

      const interceptors = resilienceInterceptorsBuilder
        .addTimeoutInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).rejects.toThrowError(
        new TimeoutException(request.options.timeout)
      );
    });

    it('should not apply timeout when options.timeout is false', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          timeout: false, // Explicitly set to false
        },
      };

      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'success';
      };

      const interceptors = resilienceInterceptorsBuilder
        .addTimeoutInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'success'
      );
    });

    it('should apply default timeout when options.timeout is undefined', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          // timeout is undefined (default 30s)
        },
      };

      vitest.useFakeTimers();

      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      };

      const interceptors = resilienceInterceptorsBuilder
        .addTimeoutInterceptor()
        .build();

      const executePromise = interceptors.execute(request, handler);

      vitest.advanceTimersByTime(30000);

      await expect(executePromise).rejects.toThrowError(TimeoutException);

      vitest.clearAllTimers();
    });
  });

  describe('ThrottleInterceptor', () => {
    it('should throttle the task', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          throttle: {
            rate: 3,
            interval: '1s',
          },
        },
      };

      const handler = vitest.fn();
      const interceptors = resilienceInterceptorsBuilder
        .addThrottleInterceptor()
        .build();

      // Execute the first three requests
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();

      // The fourth call should throw a ThrottleException
      await expect(interceptors.execute(request, handler)).rejects.toThrowError(
        new ThrottleException(
          request.options.throttle.rate,
          request.options.throttle.interval as any
        )
      );

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should not apply throttle when options.throttle is false', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          throttle: false, // Explicitly set to false
        },
      };

      const handler = vitest.fn();
      const interceptors = resilienceInterceptorsBuilder
        .addThrottleInterceptor()
        .build();

      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalledTimes(1); // Only the initial call
    });

    it('should apply default throttle when options.throttle is undefined', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          // throttle is undefined (default interval 5s, rate 5)
        },
      };

      vitest.useFakeTimers();

      const handler = vitest.fn();

      const interceptors = resilienceInterceptorsBuilder
        .addThrottleInterceptor()
        .build();

      // Execute the first five requests
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();

      // The sixth call should throw a ThrottleException
      await expect(interceptors.execute(request, handler)).rejects.toThrowError(
        new ThrottleException(5, '5s')
      );

      expect(handler).toHaveBeenCalledTimes(5);

      // Advance time by 5.001 seconds
      vitest.advanceTimersByTime(5001);

      // The seventh call should pass
      await expect(
        interceptors.execute(request, handler)
      ).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalledTimes(6);

      vitest.clearAllTimers();
    });
  });

  describe('FallbackInterceptor', () => {
    it('should fallback to the fallback handler', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          fallback: async () => 'fallback',
        },
      };

      const handler = vitest.fn().mockRejectedValue(new Error('Test error'));
      const interceptors = resilienceInterceptorsBuilder
        .addFallbackInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'fallback'
      );
    });
  });

  describe('CacheInterceptor', () => {
    it('should cache the result of the task', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          cache: {
            ttl: '10s',
          },
        },
      };

      const handler = vitest.fn().mockResolvedValue('result');
      const handler2 = vitest.fn().mockResolvedValue('result2');
      const interceptors = resilienceInterceptorsBuilder
        .addCacheInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'result'
      );
      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'result'
      );
      await expect(interceptors.execute(request, handler2)).resolves.toBe(
        'result'
      );

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should not apply cache when options.cache is false', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          cache: false, // Explicitly set to false
        },
      };

      const handler = vitest.fn().mockResolvedValue('result');
      const interceptors = resilienceInterceptorsBuilder
        .addCacheInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'result'
      );
      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'result'
      );

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should apply default cache when options.cache is undefined', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
        options: {
          // cache is undefined (default ttl 5m)
        },
      };

      vitest.useFakeTimers();

      const handler = vitest.fn().mockResolvedValue('result');
      const interceptors = resilienceInterceptorsBuilder
        .addCacheInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'result'
      );
      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'result'
      );

      expect(handler).toHaveBeenCalledOnce();

      // Advance time by 5 minutes
      vitest.advanceTimersByTime(300001);

      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'result'
      );

      expect(handler).toHaveBeenCalledTimes(2);

      vitest.clearAllTimers();
    });
  });

  describe('DefaultHandlerInterceptor', () => {
    beforeEach(() => {
      resilienceInterceptorsBuilder = new ResilienceInterceptorsBuilder(
        cache,
        new KumikoLogger(),
        {
          serialize: (request) => JSON.stringify(request),
          defaultHandler: async () => 'default',
        }
      );
    });

    it('should call the default handler if the task throws a NoHandlerFoundException and the defaultHandler is not provided', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
      };

      const handler = vitest
        .fn()
        .mockRejectedValue(new NoHandlerFoundException('channel'));
      const interceptors = resilienceInterceptorsBuilder
        .addDefaultHandlerInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).resolves.toBe(
        'default'
      );
    });

    it('should not call the default handler if the task throws an error that is not NoHandlerFoundException', async () => {
      const request = {
        name: 'test',
        payload: { id: '1' },
      };

      const handler = vitest.fn().mockRejectedValue(new Error('Test error'));
      const interceptors = resilienceInterceptorsBuilder
        .addDefaultHandlerInterceptor()
        .build();

      await expect(interceptors.execute(request, handler)).rejects.toThrowError(
        'Test error'
      );
    });
  });
});
