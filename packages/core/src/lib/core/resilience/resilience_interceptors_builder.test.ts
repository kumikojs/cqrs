/* eslint-disable @typescript-eslint/no-explicit-any */

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
  });

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
  });
});
