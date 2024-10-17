import { NoHandlerFoundException } from '../../infrastructure/bus/bus_exception';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { ThrottleException } from '../resilience/strategies/exceptions/throttle_exception';
import { TimeoutException } from '../resilience/strategies/exceptions/timeout_exception';
import { QueryCache } from './query_cache';
import { QueryInterceptors } from './query_interceptors';

describe('QueryInterceptors', () => {
  let queryInterceptors: QueryInterceptors<never, never>;
  let cache: QueryCache;
  let logger: KumikoLogger;

  beforeEach(() => {
    cache = new QueryCache({
      l2: { driver: new MemoryStorageDriver() },
    });
    logger = new KumikoLogger();
    queryInterceptors = new QueryInterceptors(cache, logger, {
      timeout: 1000,
      retry: { maxAttempts: 3, delay: 100 },
      throttle: { rate: 5, interval: '1s' },
    });
  });

  it('should build interceptors with retry, timeout, throttle, and cache', () => {
    const interceptors = queryInterceptors.buildInterceptors();
    expect(interceptors).toBeDefined();
  });

  describe('Deduplication Interceptor', () => {
    it('should deduplicate queries', async () => {
      const query = {
        queryName: 'TestQuery',
        payload: { id: 1 },
        options: { cache: false },
      };
      const handler = vitest.fn().mockResolvedValue('Success');

      const interceptors = queryInterceptors.buildInterceptors();

      await Promise.all([
        interceptors.execute(query, handler),
        interceptors.execute(query, handler),
        interceptors.execute(query, handler),
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Interceptor', () => {
    it('should call the fallback handler if the query handler throws an error', async () => {
      const query = {
        queryName: 'TestQuery',
        payload: { id: 1 },
        options: { fallback: () => 'FallbackHandler' },
      };
      const handler = vitest.fn().mockRejectedValue(new Error('Failed'));

      const interceptors = queryInterceptors.buildInterceptors();

      await expect(interceptors.execute(query, handler)).resolves.toBe(
        'FallbackHandler'
      );
    });
  });

  describe('Cache Interceptor', () => {
    it('should return a cached result if available', async () => {
      const query = {
        queryName: 'TestQuery',
        payload: { id: 1 },
        options: { cache: { validityPeriod: 1000 } },
      };
      const handler = vitest.fn().mockResolvedValue('CachedResult');

      const interceptors = queryInterceptors.buildInterceptors();
      const result = await interceptors.execute(query, handler);
      expect(result).toBe('CachedResult');
      expect(handler).toHaveBeenCalledTimes(1);

      const secondResult = await interceptors.execute(query, handler);
      expect(secondResult).toBe('CachedResult');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should cache the result of the query after execution and respect validityPeriod', async () => {
      vitest.useFakeTimers();

      const query = {
        queryName: 'TestQuery',
        payload: { id: 1 },
        options: {
          cache: {
            validityPeriod: 1000,
            gracePeriod: 0, // Disable stale cache
          },
        },
      };

      const handler = vitest.fn().mockResolvedValue('CachedResult'); // Query handler

      const interceptors = queryInterceptors.buildInterceptors();

      // First execution should cache the result
      const firstResult = await interceptors.execute(query, handler);
      expect(firstResult).toBe('CachedResult');
      expect(handler).toHaveBeenCalledTimes(1); // Handler should be called

      // Simulate time passing within the TTL (500ms)
      vitest.advanceTimersByTime(500);

      // Second execution should return the cached result
      const secondResult = await interceptors.execute(query, handler);
      expect(secondResult).toBe('CachedResult');
      expect(handler).toHaveBeenCalledTimes(1); // Handler should NOT be called again (cache hit)

      // Simulate time passing beyond the TTL (1000ms total)
      vitest.advanceTimersByTime(1000);

      // Now the cache should be expired, so the handler should be called again
      const thirdResult = await interceptors.execute(query, handler);
      expect(thirdResult).toBe('CachedResult');
      expect(handler).toHaveBeenCalledTimes(2); // Handler should be called again (cache expired)

      vitest.useRealTimers();
    });
  });

  describe('Retry Interceptor', () => {
    it('should retry a failed query until it succeeds', async () => {
      const query = {
        queryName: 'TestQuery',
        payload: { id: 1 },
        options: { retry: { maxAttempts: 2, delay: 100 } },
      };
      const handler = vitest
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('Success');

      const interceptors = queryInterceptors.buildInterceptors();
      await expect(interceptors.execute(query, handler)).resolves.toBe(
        'Success'
      );
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should throw an error after all retry attempts fail', async () => {
      const query = {
        queryName: 'TestQuery',
        payload: { id: 1 },
        options: { retry: { maxAttempts: 2, delay: 100 } },
      };
      const handler = vitest.fn().mockRejectedValue(new Error('Failed'));

      const interceptors = queryInterceptors.buildInterceptors();
      await expect(interceptors.execute(query, handler)).rejects.toThrow(
        'Failed'
      );
      expect(handler).toHaveBeenCalledTimes(3); // initial call + 2 retries
    });
  });

  describe('Timeout Interceptor', () => {
    it('should throw a TimeoutException if the query takes too long', async () => {
      const query = {
        queryName: 'TestQuery',
        payload: { id: 1 },
        options: { timeout: 50 },
      };
      const handler = async () =>
        new Promise((resolve) => setTimeout(resolve, 100));

      const interceptors = queryInterceptors.buildInterceptors();
      await expect(interceptors.execute(query, handler)).rejects.toThrow(
        TimeoutException
      );
    });
  });

  describe('Throttle Interceptor', () => {
    it('should throttle query execution', async () => {
      const command = {
        queryName: 'TestQuery',
        payload: { id: 1, name: 'test', age: 20 },
        options: {
          throttle: { rate: 1, interval: '1s' },
          cache: false,
        },
      };
      const handler = vitest.fn();
      const interceptors = queryInterceptors.buildInterceptors();
      await interceptors.execute(command, handler);
      await expect(interceptors.execute(command, handler)).rejects.toThrow(
        ThrottleException
      );
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('Default Handler Interceptor', () => {
    it('should call defaultHandler when NoHandlerFoundException is thrown', async () => {
      const query = {
        queryName: 'TestQuery',
        payload: { id: 1 },
      };
      const handler = vitest
        .fn()
        .mockRejectedValue(new NoHandlerFoundException('channel'));

      const defaultHandler = vitest.fn().mockResolvedValue('DefaultHandler');

      queryInterceptors = new QueryInterceptors(cache, logger, {
        timeout: 1000,
        retry: { maxAttempts: 3, delay: 100 },
        throttle: { rate: 5, interval: '1s' },
        defaultHandler,
      });

      const interceptors = queryInterceptors.buildInterceptors();

      await expect(interceptors.execute(query, handler)).resolves.toBe(
        'DefaultHandler'
      );
      expect(handler).toHaveBeenCalledTimes(1);
      expect(defaultHandler).toHaveBeenCalledTimes(1);
    });
  });
});
